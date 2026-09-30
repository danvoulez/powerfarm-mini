import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { Database } from "../packages/db/src/database.ts";
import { assertSafeAdminToken, DEV_ADMIN_TOKEN, loadConfig } from "../packages/db/src/config.ts";
import { httpFixture } from "./fixture.ts";

test("malformed request paths are rejected without taking the server down", async () => {
  const f = await httpFixture(); try {
    assert.equal((await f.api("/api/v1/studies/%E0%A4%A", { auth: false })).status, 403, "authorization is checked before the path is parsed");
    const api = await f.api("/api/v1/studies/%E0%A4%A");
    assert.equal(api.status, 400);
    assert.equal(api.payload.error.code, "invalid_path");
    assert.equal((await f.api("/%E0", { auth: false })).status, 400, "static file path");
    assert.equal((await f.api("/api/v1/health", { auth: false })).status, 200, "still serving");
  } finally { await f.close(); }
});

test("a second writer waits for a held write lock instead of failing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "powerfarm-lock-"));
  const path = join(dir, "powerfarm.db");
  const db = new Database(path);
  try {
    // Another process (e.g. the worker) holds the write lock for a moment.
    const holder = new Worker(`
      const { DatabaseSync } = require("node:sqlite");
      const { parentPort, workerData } = require("node:worker_threads");
      const other = new DatabaseSync(workerData);
      other.exec("BEGIN IMMEDIATE");
      parentPort.postMessage("locked");
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
      other.exec("COMMIT");
      other.close();
    `, { eval: true, workerData: path });
    await once(holder, "message");
    const started = Date.now();
    db.transaction(() => db.run("INSERT OR REPLACE INTO meta(key,value) VALUES('lock-probe','1')"));
    assert.ok(Date.now() - started >= 150, "the write waited for the lock");
    assert.equal(db.get<any>("SELECT value FROM meta WHERE key='lock-probe'")?.value, "1");
    await once(holder, "exit");
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("nested transactions roll back only the failed inner work", () => {
  const dir = mkdtempSync(join(tmpdir(), "powerfarm-tx-"));
  const db = new Database(join(dir, "powerfarm.db"));
  const put = (key: string) => db.run("INSERT INTO meta(key,value) VALUES(?, '1')", key);
  try {
    db.transaction(() => {
      put("outer-before");
      assert.throws(() => db.transaction(() => { put("inner"); throw new Error("inner failure"); }), /inner failure/);
      db.transaction(() => put("inner-ok"));
      put("outer-after");
    });
    const keys = db.all<any>("SELECT key FROM meta WHERE key IN ('outer-before','inner','inner-ok','outer-after') ORDER BY key").map((row) => row.key);
    assert.deepEqual(keys, ["inner-ok", "outer-after", "outer-before"]);
    assert.throws(() => db.transaction(() => { put("rolled-back"); throw new Error("outer failure"); }));
    assert.equal(db.get("SELECT key FROM meta WHERE key='rolled-back'"), undefined);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the development admin token is refused beyond loopback", () => {
  const base = loadConfig();
  for (const host of ["127.0.0.1", "localhost", "::1"]) assert.doesNotThrow(() => assertSafeAdminToken({ ...base, host, adminToken: DEV_ADMIN_TOKEN }));
  for (const host of ["0.0.0.0", "::", "192.168.1.20"]) assert.throws(() => assertSafeAdminToken({ ...base, host, adminToken: DEV_ADMIN_TOKEN }), /POWERFARM_ADMIN_TOKEN/);
  assert.doesNotThrow(() => assertSafeAdminToken({ ...base, host: "0.0.0.0", adminToken: "a-long-random-secret" }));
});
