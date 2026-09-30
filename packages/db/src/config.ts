import { resolve } from "node:path";

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
    adminToken: process.env.POWERFARM_ADMIN_TOKEN ?? "powerfarm-local-admin",
    publicUrl: process.env.POWERFARM_PUBLIC_URL ?? `http://${host}:${port}`,
    rootDir: resolve(rootDir),
  };
}
