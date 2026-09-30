import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_VERSION, schemaSql } from "./schema.ts";

export type SqlParam = string | number | bigint | Uint8Array | null;

export class Database {
  readonly path: string;
  readonly raw: DatabaseSync;

  constructor(path: string) {
    this.path = resolve(path);
    mkdirSync(dirname(this.path), { recursive: true });
    this.raw = new DatabaseSync(this.path);
    this.raw.exec(schemaSql);
    this.raw.prepare("INSERT OR REPLACE INTO meta(key,value) VALUES('schema_version', ?)").run(String(SCHEMA_VERSION));
  }

  close(): void { this.raw.close(); }
  exec(sql: string): void { this.raw.exec(sql); }

  all<T = Record<string, unknown>>(sql: string, ...params: SqlParam[]): T[] {
    return this.raw.prepare(sql).all(...params) as T[];
  }

  get<T = Record<string, unknown>>(sql: string, ...params: SqlParam[]): T | undefined {
    return this.raw.prepare(sql).get(...params) as T | undefined;
  }

  run(sql: string, ...params: SqlParam[]): { changes: number; lastInsertRowid: number | bigint } {
    return this.raw.prepare(sql).run(...params) as { changes: number; lastInsertRowid: number | bigint };
  }

  transaction<T>(fn: () => T): T {
    this.raw.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.raw.exec("COMMIT");
      return value;
    } catch (error) {
      try { this.raw.exec("ROLLBACK"); } catch {}
      throw error;
    }
  }
}
