import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServerApp } from "../apps/server/src/app.ts";
import { createServices } from "../apps/server/src/services.ts";

export const adminToken = "test-admin-token";
export const adminEntity = "powerfarm.app/principal/local-admin";

function tempConfig() {
  const dir = mkdtempSync(join(tmpdir(), "powerfarm-test-"));
  return { dir, config: { host: "127.0.0.1", port: 0, dbPath: join(dir, "powerfarm.db"), objectDir: join(dir, "objects"), adminToken, publicUrl: "http://127.0.0.1", rootDir: process.cwd() } };
}

/** Domain services over a throwaway database, for tests that need to reach below the HTTP surface. */
export function serviceFixture() {
  const { dir, config } = tempConfig();
  const services = createServices(config);
  return { services, dir, close() { services.db.close(); rmSync(dir, { recursive: true, force: true }); } };
}

/** A listening server over a throwaway database. */
export async function httpFixture() {
  const { dir, config } = tempConfig();
  const app = createServerApp(config);
  await new Promise<void>((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(app.server.address() as any).port}`;
  async function api(path: string, options: { method?: string; json?: unknown; auth?: boolean } = {}) {
    const headers: Record<string, string> = {};
    if (options.auth !== false) headers.authorization = `Bearer ${adminToken}`;
    if (options.json !== undefined) headers["content-type"] = "application/json";
    const response = await fetch(base + path, { method: options.method ?? "GET", headers, body: options.json === undefined ? undefined : JSON.stringify(options.json) });
    const payload: any = (response.headers.get("content-type") ?? "").includes("json") ? await response.json() : await response.text();
    return { status: response.status, payload };
  }
  async function close() {
    await new Promise<void>((resolve) => app.server.close(() => resolve()));
    app.services.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
  return { app, base, api, close };
}
