import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { AppError } from "../../core/src/errors.ts";
import type { AuthService, Principal } from "../../auth/src/service.ts";

export type BodyMode = "json" | "raw" | "none";

export interface RequestContext {
  request: IncomingMessage;
  response: ServerResponse;
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
  rawBody: Uint8Array;
  principal: Principal | null;
  url: URL;
}

export interface RouteResult {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
  raw?: Uint8Array;
}

export type RouteHandler = (ctx: RequestContext) => Promise<RouteResult | unknown> | RouteResult | unknown;

export interface RouteDefinition {
  method: string;
  path: string;
  operationId: string;
  summary: string;
  tag: string;
  capability?: string;
  public?: boolean;
  bodyMode?: BodyMode;
  maxBodyBytes?: number;
  handler: RouteHandler;
}

interface CompiledRoute extends RouteDefinition {
  regex: RegExp;
  paramNames: string[];
}

function compilePath(path: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const parts = path.split("/").map((part) => {
    if (part.startsWith(":")) {
      paramNames.push(part.slice(1));
      return "([^/]+)";
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  return { regex: new RegExp(`^${parts.join("/")}/?$`), paramNames };
}

async function readBody(request: IncomingMessage, limit: number): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > limit) throw new AppError(413, "payload_too_large", `Request body exceeds ${limit} bytes`);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function json(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  const payload = Buffer.from(JSON.stringify(body, null, 2));
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(payload.byteLength),
    "cache-control": "no-store",
    ...headers,
  });
  response.end(payload);
}

export class Router {
  private readonly routes: CompiledRoute[] = [];
  readonly auth: AuthService;
  constructor(auth: AuthService) { this.auth = auth; }

  route(definition: RouteDefinition): this {
    const { regex, paramNames } = compilePath(definition.path);
    this.routes.push({ ...definition, method: definition.method.toUpperCase(), regex, paramNames });
    return this;
  }

  definitions(): RouteDefinition[] {
    return this.routes.map(({ regex: _regex, paramNames: _paramNames, handler, ...rest }) => ({ ...rest, handler }));
  }

  async handle(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    const host = request.headers.host ?? "127.0.0.1";
    const url = new URL(request.url ?? "/", `http://${host}`);
    const method = (request.method ?? "GET").toUpperCase();
    const route = this.routes.find((candidate) => candidate.method === method && candidate.regex.test(url.pathname));
    if (!route) return false;

    const match = route.regex.exec(url.pathname)!;
    const params = Object.fromEntries(route.paramNames.map((name, i) => [name, decodeURIComponent(match[i + 1] ?? "")]));
    const principal = this.auth.authenticate(request.headers.authorization);

    try {
      if (!route.public && route.capability) this.auth.require(principal, route.capability);
      const mode = route.bodyMode ?? (method === "GET" || method === "HEAD" ? "none" : "json");
      const rawBody = mode === "none" ? new Uint8Array() : await readBody(request, route.maxBodyBytes ?? 20 * 1024 * 1024);
      let body: Record<string, unknown> = {};
      if (mode === "json" && rawBody.byteLength > 0) {
        try {
          const parsed = JSON.parse(Buffer.from(rawBody).toString("utf8"));
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON object required");
          body = parsed;
        } catch (error: any) {
          throw new AppError(400, "invalid_json", error?.message ?? "Invalid JSON body");
        }
      }
      const result = await route.handler({ request, response, params, query: url.searchParams, body, rawBody, principal, url });
      if (response.writableEnded) return true;
      if (result && typeof result === "object" && ("status" in (result as any) || "body" in (result as any) || "raw" in (result as any))) {
        const r = result as RouteResult;
        if (r.raw) {
          response.writeHead(r.status ?? 200, { "content-length": String(r.raw.byteLength), ...r.headers });
          response.end(r.raw);
        } else {
          json(response, r.status ?? 200, r.body ?? null, r.headers);
        }
      } else if (result && typeof result === "object" && ("data" in (result as any) || "error" in (result as any))) {
        json(response, 200, result);
      } else {
        json(response, 200, { data: result });
      }
      return true;
    } catch (error: any) {
      if (response.writableEnded) return true;
      if (error instanceof AppError) {
        json(response, error.status, { error: { code: error.code, message: error.message, details: error.details ?? null } });
      } else {
        console.error(error);
        json(response, 500, { error: { code: "internal_error", message: "Internal server error" } });
      }
      return true;
    }
  }
}
