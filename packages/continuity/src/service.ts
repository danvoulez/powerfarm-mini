import type { Database } from "../../db/src/database.ts";
import { newId } from "../../core/src/ids.ts";
import { nowIso } from "../../core/src/time.ts";
import { fromJson, toJson } from "../../core/src/json.ts";
import { ConflictError, NotFoundError, ValidationError } from "../../core/src/errors.ts";
import { enumValue, jsonObject, optionalString, requiredString } from "../../core/src/validate.ts";
import { recordAct } from "../../institution/src/acts.ts";
import type { ContentStore } from "../../evidence/src/store.ts";

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
  constructor(db: Database, content: ContentStore) { this.db = db; this.content = content; }

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
    const status = enumValue(input, "status", ["draft", "armed", "retired"] as const, "draft");
    const temporal = jsonObject(input, "temporalPredicate");
    const observational = jsonObject(input, "observationalPredicate");
    const policy = jsonObject(input, "policy");
    const effect = jsonObject(input, "effect");
    const verification = jsonObject(input, "verification");
    if (typeof effect.type !== "string") throw new ValidationError("effect.type is required");
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run(`INSERT INTO executable_contracts(id,name,generation,status,temporal_predicate_json,observational_predicate_json,policy_json,effect_json,verification_json,created_at,updated_at) VALUES(?,?,1,?,?,?,?,?,?,?,?)`, id, name, status, toJson(temporal), toJson(observational), toJson(policy), toJson(effect), toJson(verification), now, now);
      recordAct(this.db, { actorId, kind: "executable_contract.created", objectType: "executable_contract", objectId: id, payload: { id, name, generation: 1, status, temporalPredicate: temporal, observationalPredicate: observational, policy, effect, verification } });
    });
    return this.getContract(id);
  }

  trigger(contractId: string, input: Record<string, unknown>, actorId: string) {
    const contract = this.getContract(contractId);
    if (contract.status === "retired") throw new ConflictError("Cannot execute a retired contract");
    const id = newId("exe");
    const trigger = jsonObject(input, "trigger");
    const idempotencyKey = optionalString(input, "idempotencyKey", 500) ?? `${contractId}:${contract.generation}:${newId("idem")}`;
    const now = nowIso();
    try {
      this.db.transaction(() => {
        this.db.run("INSERT INTO executions(id,contract_id,contract_generation,trigger_json,state,idempotency_key,created_at) VALUES(?,?,?,?,'ready',?,?)", id, contractId, contract.generation, toJson(trigger), idempotencyKey, now);
        recordAct(this.db, { actorId, kind: "execution.triggered", objectType: "execution", objectId: id, payload: { id, contractId, generation: contract.generation, trigger, idempotencyKey } });
      });
    } catch (error: any) {
      if (String(error?.message).includes("UNIQUE")) {
        const existing = this.db.get<any>("SELECT * FROM executions WHERE idempotency_key=?", idempotencyKey);
        if (existing) return decode(existing, ["trigger_json"]);
      }
      throw error;
    }
    return this.getExecution(id);
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

  claimNext(workerId: string): any | null {
    return this.db.transaction(() => {
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
    const startedAt = nowIso();
    this.db.run("UPDATE executions SET state='executing', started_at=? WHERE id=?", startedAt, execution.id);
    try {
      const result = this.materializeEffect(effect, execution, workerId);
      const verified = this.verifyEffect(verification, result);
      const receiptId = newId("rcp");
      const state = verified ? "done" : "uncertain";
      const finished = nowIso();
      this.db.transaction(() => {
        this.db.run("INSERT INTO execution_receipts(id,execution_id,receipt_kind,payload_json,verified,created_at) VALUES(?,?,?,?,?,?)", receiptId, execution.id, String(effect.type ?? "unknown"), toJson(result), verified ? 1 : 0, finished);
        this.db.run("UPDATE executions SET state=?, completed_at=? WHERE id=?", state, finished, execution.id);
        recordAct(this.db, { actorId: workerId, kind: verified ? "execution.verified" : "execution.uncertain", objectType: "execution", objectId: execution.id, payload: { receiptId, result, verified } });
      });
      return this.getExecution(execution.id);
    } catch (error: any) {
      const finished = nowIso();
      this.db.transaction(() => {
        this.db.run("UPDATE executions SET state='failed', error_text=?, completed_at=? WHERE id=?", String(error?.stack ?? error), finished, execution.id);
        recordAct(this.db, { actorId: workerId, kind: "execution.failed", objectType: "execution", objectId: execution.id, payload: { error: String(error?.message ?? error) } });
      });
      return this.getExecution(execution.id);
    }
  }

  private materializeEffect(effect: Record<string, unknown>, execution: any, actorId: string): unknown {
    switch (effect.type) {
      case "noop":
        return { type: "noop", executionId: execution.id, at: nowIso(), input: effect.payload ?? null };
      case "record.act": {
        const objectType = typeof effect.objectType === "string" ? effect.objectType : "external_effect";
        const objectId = typeof effect.objectId === "string" ? effect.objectId : execution.id;
        const kind = typeof effect.kind === "string" ? effect.kind : "continuity.effect.materialized";
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
