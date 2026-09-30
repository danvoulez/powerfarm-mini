import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import type { RuntimeConfig } from "../../../packages/db/src/config.ts";
import { createServices } from "./services.ts";
import { buildRouter } from "./routes.ts";
import { decodePathSegment } from "../../../packages/api/src/router.ts";
import { AppError } from "../../../packages/core/src/errors.ts";

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function applySecurityHeaders(response: ServerResponse): void {
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "same-origin");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}

function serveStatic(request: IncomingMessage, response: ServerResponse, publicDir: string): boolean {
  if ((request.method ?? "GET") !== "GET") return false;
  const url = new URL(request.url ?? "/", "http://localhost");
  let pathname = decodePathSegment(url.pathname);
  if (pathname.startsWith("/api/")) return false;
  if (pathname === "/") pathname = "/index.html";
  const candidate = resolve(publicDir, `.${normalize(pathname)}`);
  if (!candidate.startsWith(resolve(publicDir))) return false;
  let file = candidate;
  if (!existsSync(file) || !statSync(file).isFile()) file = join(publicDir, "index.html");
  if (!existsSync(file)) return false;
  const stat = statSync(file);
  response.writeHead(200, {
    "content-type": mime[extname(file)] ?? "application/octet-stream",
    "content-length": String(stat.size),
    "cache-control": file.endsWith("index.html") ? "no-store" : "public, max-age=300",
  });
  createReadStream(file).pipe(response);
  return true;
}

function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  if (response.headersSent) {
    response.destroy();
    return;
  }
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: { code, message } }));
}

export function createServerApp(config: RuntimeConfig) {
  const services = createServices(config);
  const router = buildRouter(services);
  const publicDir = join(config.rootDir, "apps", "web", "public");

  const server = createServer(async (request, response) => {
    applySecurityHeaders(response);
    try {
      if (request.method === "OPTIONS") {
        response.writeHead(204, { "allow": "GET, POST, PATCH, PUT, DELETE, OPTIONS" });
        response.end();
        return;
      }
      const handled = await router.handle(request, response);
      if (handled) return;
      if (serveStatic(request, response, publicDir)) return;
      sendError(response, 404, "not_found", "Route not found");
    } catch (error) {
      // Last line of defence: a single bad request must never take the process down.
      if (error instanceof AppError) sendError(response, error.status, error.code, error.message);
      else {
        console.error(error);
        sendError(response, 500, "internal_error", "Internal server error");
      }
    }
  });

  return { server, services, router };
}
