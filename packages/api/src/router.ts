import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { AppError } from "../../core/src/errors.ts";
import type { AuthService, Principal } from "../../auth/src/service.ts";

export type BodyMode = "json" | "raw" | "none";

/** Names of the `:param` segments in a route path, e.g. "/studies/:id/runs" -> "id". */
export type PathParams<Path extends string> =
  Path extends `${string}:${infer Name}/${infer Rest}` ? Name | PathParams<`/${Rest}`>
  : Path extends `${string}:${infer Name}` ? Name
  : never;

export interface RequestContext<Param extends string = string> {
  request: IncomingMessage;
  response: ServerResponse;
  params: Record<Param, string>;
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

export type RouteHandler<Param extends string = string> = (ctx: RequestContext<Param>) => Promise<RouteResult | unknown> | RouteResult | unknown;

export interface RouteDefinition<Path extends string = string> {
  method: string;
  path: Path;
  operationId: string;
  summary: string;
  tag: string;
  capability?: string;
  public?: boolean;
  bodyMode?: BodyMode;
  maxBodyBytes?: number;
  handler: RouteHandler<PathParams<Path>>;
}

interface CompiledRoute extends Omit<RouteDefinition, "handler"> {
  handler: RouteHandler;
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

export function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    throw new AppError(400, "invalid_path", "Malformed percent-encoding in request path");
  }
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

  route<const Path extends string>(definition: RouteDefinition<Path>): this {
    const { regex, paramNames } = compilePath(definition.path);
    // compilePath captures every `:param` in the path, so the handler always receives the params it declares.
    const handler = definition.handler as RouteHandler;
    this.routes.push({ ...definition, handler, method: definition.method.toUpperCase(), regex, paramNames });
    return this;
  }

  definitions(): RouteDefinition[] {
    return this.routes.map(({ regex: _regex, paramNames: _paramNames, handler, ...rest }) => ({ ...rest, handler }));
  }

  async handle(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    // The Host header is client-controlled; only the path and query are used, so parse against a fixed base.
    let url: URL;
    try {
      url = new URL(request.url ?? "/", "http://localhost");
    } catch {
      json(response, 400, { error: { code: "invalid_url", message: "Malformed request URL", details: null } });
      return true;
    }
    const method = (request.method ?? "GET").toUpperCase();
    const route = this.routes.find((candidate) => candidate.method === method && candidate.regex.test(url.pathname));
    if (!route) return false;

    try {
      const principal = this.auth.authenticate(request.headers.authorization);
      if (!route.public && route.capability) this.auth.require(principal, route.capability);
      const match = route.regex.exec(url.pathname)!;
      const params = Object.fromEntries(route.paramNames.map((name, i) => [name, decodePathSegment(match[i + 1] ?? "")]));
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
