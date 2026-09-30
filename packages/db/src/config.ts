import { resolve } from "node:path";

/** Well-known development credential; only acceptable while the server is reachable from this machine alone. */
export const DEV_ADMIN_TOKEN = "powerfarm-local-admin";

export interface RuntimeConfig {
  host: string;
  port: number;
  dbPath: string;
  objectDir: string;
  adminToken: string;
  publicUrl: string;
  rootDir: string;
}

export function loadConfig(rootDir = process.cwd()): RuntimeConfig {
  const host = process.env.POWERFARM_HOST ?? "127.0.0.1";
  const port = Number(process.env.POWERFARM_PORT ?? 4545);
  return {
    host,
    port,
    dbPath: resolve(rootDir, process.env.POWERFARM_DB ?? "./var/powerfarm.db"),
    objectDir: resolve(rootDir, process.env.POWERFARM_OBJECTS ?? "./var/objects"),
    adminToken: process.env.POWERFARM_ADMIN_TOKEN ?? DEV_ADMIN_TOKEN,
    publicUrl: process.env.POWERFARM_PUBLIC_URL ?? `http://${host}:${port}`,
    rootDir: resolve(rootDir),
  };
}

export function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "::1" || /^127\.\d+\.\d+\.\d+$/.test(host);
}

/** Refuses to expose the well-known development admin token beyond the local machine. */
export function assertSafeAdminToken(config: RuntimeConfig): void {
  if (config.adminToken === DEV_ADMIN_TOKEN && !isLoopbackHost(config.host)) {
    throw new Error(`Refusing to bind ${config.host} with the development admin token. Set POWERFARM_ADMIN_TOKEN to a long random secret.`);
  }
}
