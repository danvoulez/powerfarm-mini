import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { Database } from "../packages/db/src/database.ts";
import { replayAll } from "../packages/institution/src/replay.ts";
import { fromJson } from "../packages/core/src/json.ts";
import { recordAct } from "../packages/institution/src/acts.ts";
import { adminEntity as actor, httpFixture, serviceFixture } from "./fixture.ts";

const conflict = (pattern: RegExp) => (error: any) => error.status === 409 && pattern.test(error.message);
const invalid = (error: any) => error.status === 422;
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

function acts(db: Database) {
  return db.all<any>("SELECT * FROM recorded_acts ORDER BY seq").map((act) => ({ ...act, payload: fromJson(act.payload_json, {}) }));
}

function replayInto(dir: string, source: Database): Database {
  const replayed = new Database(join(dir, "replayed.db"));
  replayed.transaction(() => replayAll(replayed, acts(source)));
  return replayed;
}

/** Writes a contract as the pre-validation code did (row plus act), so it bypasses creation-time checks. */
function legacyContract(db: Database, id: string, effect: unknown, verification: unknown = {}) {
  const now = new Date().toISOString();
  db.transaction(() => {
    db.run("INSERT INTO executable_contracts(id,name,generation,status,temporal_predicate_json,observational_predicate_json,policy_json,effect_json,verification_json,created_at,updated_at) VALUES(?,?,1,'armed','{}','{}','{}',?,?,?,?)", id, id, JSON.stringify(effect), JSON.stringify(verification), now, now);
    recordAct(db, { actorId: actor, kind: "executable_contract.created", objectType: "executable_contract", objectId: id, payload: { id, name: id, generation: 1, status: "armed", effect, verification } });
  });
}

test("a dormant contract cannot trigger until armed, and retirement is terminal", () => {
  const f = serviceFixture(); const c = f.services.continuity; try {
    const contract = c.createContract({ name: "dormant", effect: { type: "noop" } }, actor);
    assert.equal(contract.status, "draft");
    assert.equal(c.readiness(contract.id).readiness.state, "dormant");
    assert.throws(() => c.trigger(contract.id, {}, actor), conflict(/dormant/));
    c.updateContractStatus(contract.id, { status: "armed" }, actor);
    assert.equal(c.trigger(contract.id, {}, actor).state, "ready");
    c.updateContractStatus(contract.id, { status: "retired" }, actor);
    assert.throws(() => c.trigger(contract.id, {}, actor), conflict(/retired/));
    assert.throws(() => c.updateContractStatus(contract.id, { status: "armed" }, actor), conflict(/retired/));
  } finally { f.close(); }
});

test("observational readiness follows the latest matching evidence", () => {
  const f = serviceFixture(); const { continuity: c, signals } = f.services; try {
    const contract = c.createContract({ name: "room", status: "armed", observationalPredicate: { type: "all", of: [{ type: "signal", kind: "room_ready", subject: "room-1", equals: true }, { type: "signal", kind: "teacher_present" }] }, effect: { type: "noop" } }, actor);
    assert.equal(c.readiness(contract.id).readiness.state, "waiting_observation");
    assert.throws(() => c.trigger(contract.id, {}, actor), conflict(/no observational evidence "room_ready" for room-1/));

    signals.record({ domain: "observational", kind: "room_ready", subject: "room-1", value: true, observedAt: minutesAgo(2) }, actor);
    signals.record({ domain: "observational", kind: "room_ready", subject: "room-1", value: false, observedAt: minutesAgo(1) }, actor);
    signals.record({ domain: "observational", kind: "teacher_present", subject: "teacher-1", value: true }, actor);
    assert.match(c.readiness(contract.id).readiness.observational.reason, /does not have the required value/);

    const ready = signals.record({ domain: "observational", kind: "room_ready", subject: "room-1", value: true }, actor)!;
    const { readiness } = c.readiness(contract.id);
    assert.equal(readiness.state, "ready");
    assert.ok(readiness.observational.evidence.includes(ready.id));

    const execution = c.trigger(contract.id, {}, actor);
    const triggered = acts(f.services.db).find((act) => act.kind === "execution.triggered" && act.object_id === execution.id);
    assert.equal(triggered.payload.readiness.state, "ready", "the readiness that justified the trigger is recorded");
  } finally { f.close(); }
});

test("temporal windows and stale evidence keep a contract waiting", () => {
  const f = serviceFixture(); const { continuity: c, signals } = f.services; try {
    signals.record({ domain: "observational", kind: "heartbeat", subject: "node-1", value: {}, observedAt: minutesAgo(60) }, actor);
    const opensLater = new Date(Date.now() + 3_600_000).toISOString();
    const contract = c.createContract({ name: "window", status: "armed", temporalPredicate: { type: "window", notBefore: opensLater }, observationalPredicate: { type: "signal", kind: "heartbeat", withinSeconds: 60 }, effect: { type: "noop" } }, actor);
    const { readiness } = c.readiness(contract.id);
    assert.equal(readiness.state, "waiting_both");
    assert.match(readiness.temporal.reason, /window opens/);
    assert.match(readiness.observational.reason, /older than 60s/);

    const open = c.createContract({ name: "open window", status: "armed", temporalPredicate: { type: "window", notAfter: opensLater }, effect: { type: "noop" } }, actor);
    assert.equal(c.readiness(open.id).readiness.state, "ready");
    assert.equal(c.readiness(open.id).readiness.clock.source, "platform-clock");
  } finally { f.close(); }
});

test("a manual observation is satisfied only by an explicit trigger request", () => {
  const f = serviceFixture(); const c = f.services.continuity; try {
    const contract = c.createContract({ name: "manual", status: "armed", observationalPredicate: { type: "manual" }, effect: { type: "noop" } }, actor);
    assert.equal(c.readiness(contract.id).readiness.state, "waiting_observation");
    assert.equal(c.trigger(contract.id, {}, actor).state, "ready");
  } finally { f.close(); }
});

test("first_match admits one trigger per generation; retries with the same key return it", () => {
  const f = serviceFixture(); const c = f.services.continuity; try {
    const once = c.createContract({ name: "once", status: "armed", policy: { mode: "first_match" }, effect: { type: "noop" } }, actor);
    const first = c.trigger(once.id, { idempotencyKey: "k1" }, actor);
    assert.equal(c.trigger(once.id, { idempotencyKey: "k1" }, actor).id, first.id);
    assert.throws(() => c.trigger(once.id, {}, actor), conflict(/Policy declined.*first_match/));
    assert.equal(c.readiness(once.id).policy.trigger, false);

    const again = c.createContract({ name: "again", status: "armed", policy: { mode: "retrigger" }, effect: { type: "noop" } }, actor);
    assert.notEqual(c.trigger(again.id, {}, actor).id, c.trigger(again.id, {}, actor).id);
    assert.throws(() => c.trigger(again.id, { idempotencyKey: "k1" }, actor), conflict(/another contract/));
  } finally { f.close(); }
});

test("contracts with unsupported terms are rejected at creation", () => {
  const f = serviceFixture(); const c = f.services.continuity; try {
    const bad: Record<string, unknown>[] = [
      { temporalPredicate: { type: "cron", expression: "* * * * *" } },
      { observationalPredicate: { type: "window", notBefore: "2026-01-01T00:00:00Z" } },
      { temporalPredicate: { type: "manual" } },
      { observationalPredicate: { type: "signal" } },
      { observationalPredicate: { type: "signal", kind: "x", withinSeconds: -1 } },
      { observationalPredicate: { type: "all", of: [] } },
      { temporalPredicate: { type: "window", notBefore: "not a date" } },
      { policy: { mode: "edge" } },
      { policy: { mode: "first_match", concurrency: 1 } },
      { effect: { type: "http.post", url: "https://example.com" } },
      { effect: { type: "record.act", kind: "grant.issued" } },
      { effect: { type: "noop" }, verification: { type: "eventually" } },
    ];
    for (const terms of bad) {
      assert.throws(() => c.createContract({ name: "bad", effect: { type: "noop" }, ...terms }, actor), invalid, JSON.stringify(terms));
    }
  } finally { f.close(); }
});

test("record.act effects cannot forge acts that replay would recognize", () => {
  const f = serviceFixture(); const { continuity: c, db, institution } = f.services; try {
    const subject = institution.createEntity({ id: "powerfarm.app/principal/escalator", kind: "principal", name: "Escalator" }, actor).id;
    const forged = { type: "record.act", kind: "grant.issued", objectType: "grant", objectId: "grant_forged", payload: { id: "grant_forged", subjectEntityId: subject, capability: "*" } };
    assert.throws(() => c.createContract({ name: "forge", status: "armed", effect: forged }, actor), invalid);

    legacyContract(db, "legacy-forge", forged);
    c.trigger("legacy-forge", {}, actor);
    assert.equal(c.runNext("w").state, "failed");
    assert.ok(!acts(db).some((act) => act.kind === "grant.issued"));

    const honest = c.createContract({ name: "honest", status: "armed", effect: { type: "record.act", kind: "continuity.effect.probe", payload: { ok: true } } }, actor);
    c.trigger(honest.id, {}, actor);
    assert.equal(c.runNext("w").state, "done");

    const replayed = replayInto(f.dir, db);
    assert.deepEqual(replayed.all("SELECT * FROM grants WHERE subject_entity_id=?", subject), []);
    replayed.close();
  } finally { f.close(); }
});

test("a failed execution rolls back its effect together with its receipt", () => {
  const f = serviceFixture(); const { continuity: c, db } = f.services; try {
    legacyContract(db, "legacy-bad-verifier", { type: "record.act", kind: "continuity.effect.side-effect" }, { type: "eventually" });
    c.trigger("legacy-bad-verifier", {}, actor);
    const execution = c.runNext("w");
    assert.equal(execution.state, "failed");
    assert.deepEqual(execution.receipts, []);
    assert.ok(!acts(db).some((act) => act.kind === "continuity.effect.side-effect"), "effect act rolled back");
  } finally { f.close(); }
});

test("expired leases re-queue claimed executions and mark executing ones uncertain", () => {
  const f = serviceFixture(); const { continuity: c, db } = f.services; try {
    const contract = c.createContract({ name: "lease", status: "armed", effect: { type: "noop" } }, actor);
    const abandonedClaim = c.trigger(contract.id, {}, actor);
    const abandonedEffect = c.trigger(contract.id, {}, actor);
    assert.equal(c.claimNext("crashed-worker").id, abandonedClaim.id);
    assert.equal(c.claimNext("crashed-worker").id, abandonedEffect.id);
    db.run("UPDATE executions SET claimed_at=? WHERE id=?", minutesAgo(10), abandonedClaim.id);
    db.run("UPDATE executions SET state='executing', claimed_at=?, started_at=? WHERE id=?", minutesAgo(10), minutesAgo(10), abandonedEffect.id);

    const next = c.runNext("fresh-worker");
    assert.equal(next.id, abandonedClaim.id, "the never-started execution is re-queued and runs");
    assert.equal(next.state, "done");
    assert.equal(next.claimed_by, "fresh-worker");
    assert.equal(c.getExecution(abandonedEffect.id).state, "uncertain", "a possibly-materialized effect is not retried blindly");
    assert.equal(c.runNext("fresh-worker"), null);

    const expired = acts(db).filter((act) => act.kind === "execution.lease.expired").map((act) => [act.object_id, act.payload.previousState, act.payload.state]);
    assert.deepEqual(expired.sort(), [[abandonedClaim.id, "claimed", "ready"], [abandonedEffect.id, "executing", "uncertain"]].sort());

    const replayed = replayInto(f.dir, db);
    assert.equal(replayed.get<any>("SELECT state FROM executions WHERE id=?", abandonedClaim.id)?.state, "done");
    assert.equal(replayed.get<any>("SELECT state FROM executions WHERE id=?", abandonedEffect.id)?.state, "uncertain");
    replayed.close();
  } finally { f.close(); }
});

test("Continuity status and readiness are exposed over HTTP", async () => {
  const f = await httpFixture(); try {
    let x = await f.api("/api/v1/executable-contracts", { method: "POST", json: { name: "http", effect: { type: "noop" }, observationalPredicate: { type: "signal", kind: "webhook" } } });
    const id = x.payload.data.id;
    x = await f.api(`/api/v1/executable-contracts/${id}/trigger`, { method: "POST", json: {} });
    assert.equal(x.status, 409);
    assert.equal(x.payload.error.details.readiness.state, "dormant");
    x = await f.api(`/api/v1/executable-contracts/${id}/status`, { method: "POST", json: { status: "armed" } });
    assert.equal(x.payload.data.status, "armed");
    x = await f.api(`/api/v1/executable-contracts/${id}/readiness`);
    assert.equal(x.payload.data.readiness.state, "waiting_observation");
    await f.api("/api/v1/evidence-signals", { method: "POST", json: { domain: "observational", kind: "webhook", subject: "github", value: { event: "push" } } });
    x = await f.api(`/api/v1/executable-contracts/${id}/trigger`, { method: "POST", json: {} });
    assert.equal(x.status, 201);
    x = await f.api("/api/v1/evidence-signals", { method: "POST", json: { domain: "observational", kind: "webhook", subject: "github", observedAt: "yesterday-ish" } });
    assert.equal(x.status, 422);
  } finally { await f.close(); }
});
