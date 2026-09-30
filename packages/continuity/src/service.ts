import type { Database } from "../../db/src/database.ts";
import { newId } from "../../core/src/ids.ts";
import { nowIso } from "../../core/src/time.ts";
import { fromJson, toJson } from "../../core/src/json.ts";
import { ConflictError, NotFoundError, ValidationError } from "../../core/src/errors.ts";
import { enumValue, jsonObject, optionalString, requiredString } from "../../core/src/validate.ts";
import { recordAct } from "../../institution/src/acts.ts";
import type { ContentStore } from "../../evidence/src/store.ts";
import { decidePolicy, evaluateReadiness, validatePolicy, validatePredicate } from "./readiness.ts";

/** A claimed or executing execution whose worker has been silent this long is recovered by the next claim. */
export const DEFAULT_LEASE_MS = 5 * 60 * 1000;

/** `record.act` effects may only write acts in this namespace, which replay never interprets as recognized state. */
export const EFFECT_ACT_PREFIX = "continuity.effect.";

const contractStatuses = ["draft", "armed", "retired"] as const;
const effectTypes = ["noop", "record.act", "content.put-json"] as const;
const verificationTypes = ["receipt_exists", "content_digest", "manual"] as const;

function validateEffect(effect: Record<string, unknown>): void {
  if (!effectTypes.includes(effect.type as any)) throw new ValidationError(`effect.type must be one of: ${effectTypes.join(", ")}`);
  if (effect.type === "record.act" && effect.kind !== undefined) {
    if (typeof effect.kind !== "string" || !effect.kind.startsWith(EFFECT_ACT_PREFIX) || effect.kind.length <= EFFECT_ACT_PREFIX.length) {
      throw new ValidationError(`effect.kind must start with "${EFFECT_ACT_PREFIX}"`);
    }
  }
}

function validateVerification(verification: Record<string, unknown>): void {
  if (verification.type !== undefined && !verificationTypes.includes(verification.type as any)) {
    throw new ValidationError(`verification.type must be one of: ${verificationTypes.join(", ")}`);
  }
}

function decode(row: any, fields: string[]): any {
  if (!row) return row;
  const out = { ...row };
  for (const field of fields) {
    out[field.replace(/_json$/, "")] = fromJson(out[field], {});
    delete out[field];
  }
  return out;
}

export class ContinuityService {
  readonly db: Database;
  readonly content: ContentStore;
  readonly leaseMs: number;
  constructor(db: Database, content: ContentStore, options: { leaseMs?: number } = {}) {
    this.db = db;
    this.content = content;
    this.leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
  }

  listRoutes() {
    return this.db.all<any>("SELECT * FROM execution_routes ORDER BY created_at DESC LIMIT 200")
      .map((r) => decode(r, ["configuration_json"]));
  }

  createRoute(input: Record<string, unknown>, actorId: string) {
    const id = newId("route");
    const name = requiredString(input, "name", 300);
    const configuration = jsonObject(input, "configuration");
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run("INSERT INTO execution_routes(id,name,configuration_json,status,created_at,updated_at) VALUES(?,?,?,'active',?,?)", id, name, toJson(configuration), now, now);
      recordAct(this.db, { actorId, kind: "execution_route.created", objectType: "execution_route", objectId: id, payload: { id, name, configuration } });
    });
    return decode(this.db.get<any>("SELECT * FROM execution_routes WHERE id=?", id), ["configuration_json"]);
  }

  listContracts() {
    return this.db.all<any>("SELECT * FROM executable_contracts ORDER BY created_at DESC LIMIT 200")
      .map((r) => decode(r, ["temporal_predicate_json", "observational_predicate_json", "policy_json", "effect_json", "verification_json"]));
  }

  getContract(id: string) {
    const row = this.db.get<any>("SELECT * FROM executable_contracts WHERE id=?", id);
    if (!row) throw new NotFoundError("executable contract", id);
    return decode(row, ["temporal_predicate_json", "observational_predicate_json", "policy_json", "effect_json", "verification_json"]);
  }

  createContract(input: Record<string, unknown>, actorId: string) {
    const id = optionalString(input, "id", 256) ?? newId("execctr");
    const name = requiredString(input, "name", 300);
    const status = enumValue(input, "status", contractStatuses, "draft");
    const temporal = jsonObject(input, "temporalPredicate");
    const observational = jsonObject(input, "observationalPredicate");
    const policy = jsonObject(input, "policy");
    const effect = jsonObject(input, "effect");
    const verification = jsonObject(input, "verification");
    validatePredicate(temporal, "temporal", "temporalPredicate");
    validatePredicate(observational, "observational", "observationalPredicate");
    validatePolicy(policy);
    validateEffect(effect);
    validateVerification(verification);
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run(`INSERT INTO executable_contracts(id,name,generation,status,temporal_predicate_json,observational_predicate_json,policy_json,effect_json,verification_json,created_at,updated_at) VALUES(?,?,1,?,?,?,?,?,?,?,?)`, id, name, status, toJson(temporal), toJson(observational), toJson(policy), toJson(effect), toJson(verification), now, now);
      recordAct(this.db, { actorId, kind: "executable_contract.created", objectType: "executable_contract", objectId: id, payload: { id, name, generation: 1, status, temporalPredicate: temporal, observationalPredicate: observational, policy, effect, verification } });
    });
    return this.getContract(id);
  }

  /** Moves a contract between dormant (draft) and armed, or retires it. Retirement is terminal. */
  updateContractStatus(id: string, input: Record<string, unknown>, actorId: string) {
    const status = enumValue(input, "status", contractStatuses);
    const contract = this.getContract(id);
    if (contract.status === status) return contract;
    if (contract.status === "retired") throw new ConflictError("A retired contract cannot change status");
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run("UPDATE executable_contracts SET status=?, updated_at=? WHERE id=?", status, now, id);
      recordAct(this.db, { actorId, kind: "executable_contract.status.changed", objectType: "executable_contract", objectId: id, payload: { id, from: contract.status, status } });
    });
    return this.getContract(id);
  }

  /** Current readiness and policy verdict, without an explicit trigger request. */
  readiness(id: string) {
    const contract = this.getContract(id);
    return { readiness: evaluateReadiness(this.db, contract, { now: new Date(), triggerRequested: false }), policy: decidePolicy(this.db, contract) };
  }

  /**
   * Requests a trigger. Per PF-03 Appendix A an execution is created only when the contract is armed,
   * its temporal and observational predicates converge over recorded evidence, and its policy agrees.
   */
  trigger(contractId: string, input: Record<string, unknown>, actorId: string) {
    const trigger = jsonObject(input, "trigger");
    const requestedKey = optionalString(input, "idempotencyKey", 500);
    return this.db.transaction(() => {
      if (requestedKey) {
        const existing = this.db.get<any>("SELECT id, contract_id FROM executions WHERE idempotency_key=?", requestedKey);
        if (existing && existing.contract_id !== contractId) throw new ConflictError("idempotencyKey is already used by another contract's execution");
        if (existing) return this.getExecution(existing.id);
      }
      const contract = this.getContract(contractId);
      const readiness = evaluateReadiness(this.db, contract, { now: new Date(), triggerRequested: true });
      if (!readiness.ready) {
        const why = readiness.state === "dormant" ? "contract is dormant (draft); arm it first"
          : readiness.state === "retired" ? "contract is retired"
          : [readiness.temporal, readiness.observational].filter((term) => !term.satisfied).map((term) => term.reason).join("; ");
        throw new ConflictError(`Contract is not ready (${readiness.state}): ${why}`, { readiness });
      }
      const policy = decidePolicy(this.db, contract);
      if (!policy.trigger) throw new ConflictError(`Policy declined the trigger: ${policy.reason}`, { readiness, policy });

      const id = newId("exe");
      const idempotencyKey = requestedKey ?? `${contractId}:${contract.generation}:${newId("idem")}`;
      this.db.run("INSERT INTO executions(id,contract_id,contract_generation,trigger_json,state,idempotency_key,created_at) VALUES(?,?,?,?,'ready',?,?)", id, contractId, contract.generation, toJson(trigger), idempotencyKey, nowIso());
      recordAct(this.db, { actorId, kind: "execution.triggered", objectType: "execution", objectId: id, payload: { id, contractId, generation: contract.generation, trigger, idempotencyKey, readiness, policy } });
      return { ...this.getExecution(id), readiness, policy };
    });
  }

  getExecution(id: string) {
    const row = this.db.get<any>("SELECT * FROM executions WHERE id=?", id);
    if (!row) throw new NotFoundError("execution", id);
    const execution = decode(row, ["trigger_json"]);
    execution.receipts = this.db.all<any>("SELECT * FROM execution_receipts WHERE execution_id=? ORDER BY created_at", id).map((r) => ({ ...r, payload: fromJson(r.payload_json, {}), payload_json: undefined, verified: Boolean(r.verified) }));
    return execution;
  }

  listExecutions(state?: string) {
    const rows = state
      ? this.db.all<any>("SELECT * FROM executions WHERE state=? ORDER BY created_at DESC LIMIT 200", state)
      : this.db.all<any>("SELECT * FROM executions ORDER BY created_at DESC LIMIT 200");
    return rows.map((r) => decode(r, ["trigger_json"]));
  }

  /**
   * Releases claims whose worker went silent past the lease. A claimed execution never started its effect,
   * so it returns to ready. An executing one may or may not have materialized, so it becomes uncertain.
   */
  recoverExpiredLeases(actorId: string, now = new Date()): number {
    const cutoff = new Date(now.getTime() - this.leaseMs).toISOString();
    return this.db.transaction(() => {
      const stale = this.db.all<any>(
        "SELECT id, state, claimed_by, claimed_at, started_at FROM executions WHERE (state='claimed' AND claimed_at < ?) OR (state='executing' AND COALESCE(started_at, claimed_at) < ?)",
        cutoff, cutoff,
      );
      for (const row of stale) {
        const state = row.state === "claimed" ? "ready" : "uncertain";
        if (state === "ready") {
          this.db.run("UPDATE executions SET state='ready', claimed_by=NULL, claimed_at=NULL WHERE id=?", row.id);
        } else {
          this.db.run("UPDATE executions SET state='uncertain', completed_at=?, error_text=? WHERE id=?", now.toISOString(), "Lease expired while executing; effect certainty unknown", row.id);
        }
        recordAct(this.db, { actorId, kind: "execution.lease.expired", objectType: "execution", objectId: row.id, payload: { previousState: row.state, state, claimedBy: row.claimed_by, claimedAt: row.claimed_at, leaseMs: this.leaseMs } });
      }
      return stale.length;
    });
  }

  claimNext(workerId: string): any | null {
    return this.db.transaction(() => {
      this.recoverExpiredLeases(workerId);
      const row = this.db.get<any>("SELECT * FROM executions WHERE state='ready' ORDER BY created_at LIMIT 1");
      if (!row) return null;
      const now = nowIso();
      const changed = this.db.run("UPDATE executions SET state='claimed', claimed_by=?, claimed_at=? WHERE id=? AND state='ready'", workerId, now, row.id);
      if (changed.changes !== 1) return null;
      return this.getExecution(row.id);
    });
  }

  runNext(workerId = `worker-${process.pid}`): any | null {
    const execution = this.claimNext(workerId);
    if (!execution) return null;
    const contract = this.getContract(execution.contract_id);
    const effect = contract.effect as Record<string, unknown>;
    const verification = contract.verification as Record<string, unknown>;
    try {
      // Every built-in effect is local to this database (plus idempotent content-addressed bytes), so the
      // effect, its verification and its receipt commit or roll back together. A crash leaves the execution
      // claimed, and lease recovery safely returns it to ready. An effect that reaches outside the database
      // must instead commit 'executing' before acting, so an expired lease resolves it to uncertain.
      this.db.transaction(() => {
        this.db.run("UPDATE executions SET state='executing', started_at=? WHERE id=?", nowIso(), execution.id);
        const result = this.materializeEffect(effect, execution, workerId);
        const verified = this.verifyEffect(verification, result);
        const receiptId = newId("rcp");
        const state = verified ? "done" : "uncertain";
        const finished = nowIso();
        this.db.run("INSERT INTO execution_receipts(id,execution_id,receipt_kind,payload_json,verified,created_at) VALUES(?,?,?,?,?,?)", receiptId, execution.id, String(effect.type ?? "unknown"), toJson(result), verified ? 1 : 0, finished);
        this.db.run("UPDATE executions SET state=?, completed_at=? WHERE id=?", state, finished, execution.id);
        recordAct(this.db, { actorId: workerId, kind: verified ? "execution.verified" : "execution.uncertain", objectType: "execution", objectId: execution.id, payload: { receiptId, result, verified } });
      });
    } catch (error: any) {
      // The effect rolled back with the failed transaction, so 'failed' is certain.
      const finished = nowIso();
      this.db.transaction(() => {
        this.db.run("UPDATE executions SET state='failed', started_at=COALESCE(started_at, ?), error_text=?, completed_at=? WHERE id=?", finished, String(error?.stack ?? error), finished, execution.id);
        recordAct(this.db, { actorId: workerId, kind: "execution.failed", objectType: "execution", objectId: execution.id, payload: { error: String(error?.message ?? error) } });
      });
    }
    return this.getExecution(execution.id);
  }

  private materializeEffect(effect: Record<string, unknown>, execution: any, actorId: string): unknown {
    switch (effect.type) {
      case "noop":
        return { type: "noop", executionId: execution.id, at: nowIso(), input: effect.payload ?? null };
      case "record.act": {
        const objectType = typeof effect.objectType === "string" ? effect.objectType : "external_effect";
        const objectId = typeof effect.objectId === "string" ? effect.objectId : execution.id;
        const kind = typeof effect.kind === "string" ? effect.kind : `${EFFECT_ACT_PREFIX}materialized`;
        // Re-checked here for contracts stored before creation-time validation existed.
        if (!kind.startsWith(EFFECT_ACT_PREFIX)) throw new ValidationError(`record.act effects may only record "${EFFECT_ACT_PREFIX}*" acts`);
        const actId = recordAct(this.db, { actorId, kind, objectType, objectId, payload: effect.payload ?? {} });
        return { type: "record.act", actId, objectType, objectId, kind };
      }
      case "content.put-json": {
        const object = this.content.putJson(effect.value ?? {}, actorId, "execution-output");
        return { type: "content.put-json", digest: object.digest, sizeBytes: object.size_bytes };
      }
      default:
        throw new ValidationError(`Unsupported effect type: ${String(effect.type)}`);
    }
  }

  private verifyEffect(verification: Record<string, unknown>, result: any): boolean {
    const type = verification.type ?? "receipt_exists";
    switch (type) {
      case "receipt_exists": return result !== undefined && result !== null;
      case "content_digest": return typeof result?.digest === "string" && this.content.verify(result.digest).valid;
      case "manual": return false;
      default: throw new ValidationError(`Unsupported verification type: ${String(type)}`);
    }
  }
}
