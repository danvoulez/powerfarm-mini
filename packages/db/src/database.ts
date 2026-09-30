import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_VERSION, schemaSql } from "./schema.ts";

export type SqlParam = string | number | bigint | Uint8Array | null;

/** How long a connection waits for another writer (e.g. server vs. worker) before failing with SQLITE_BUSY. */
export const BUSY_TIMEOUT_MS = 5000;

export class Database {
  readonly path: string;
  readonly raw: DatabaseSync;
  private depth = 0;

  constructor(path: string) {
    this.path = resolve(path);
    mkdirSync(dirname(this.path), { recursive: true });
    this.raw = new DatabaseSync(this.path);
    // Must precede the schema/meta writes below, which can race another process opening the same file.
    this.raw.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
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

  /** Runs `fn` atomically. Nested calls become savepoints, so services can compose transactional operations. */
  transaction<T>(fn: () => T): T {
    const savepoint = this.depth > 0 ? `sp_${this.depth}` : null;
    this.raw.exec(savepoint ? `SAVEPOINT ${savepoint}` : "BEGIN IMMEDIATE");
    this.depth++;
    try {
      const value = fn();
      this.raw.exec(savepoint ? `RELEASE ${savepoint}` : "COMMIT");
      return value;
    } catch (error) {
      try { this.raw.exec(savepoint ? `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}` : "ROLLBACK"); } catch {}
      throw error;
    } finally {
      this.depth--;
    }
  }
}
