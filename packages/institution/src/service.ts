import type { Database } from "../../db/src/database.ts";
import { ConflictError, NotFoundError, ValidationError } from "../../core/src/errors.ts";
import { newId } from "../../core/src/ids.ts";
import { fromJson, toJson } from "../../core/src/json.ts";
import { nowIso } from "../../core/src/time.ts";
import { enumValue, jsonObject, optionalString, requiredString } from "../../core/src/validate.ts";
import { normalizePage } from "../../core/src/page.ts";
import { recordAct } from "./acts.ts";

function decode<T extends Record<string, any>>(row: T | undefined, jsonFields: string[] = ["metadata_json"]): any {
  if (!row) return row;
  const out: any = { ...row };
  for (const field of jsonFields) {
    if (field in out) {
      out[field.replace(/_json$/, "")] = fromJson(out[field], field.endsWith("s_json") ? [] : {});
      delete out[field];
    }
  }
  return out;
}

export class InstitutionService {
  readonly db: Database;
  constructor(db: Database) { this.db = db; }

  listEntities(query: { kind?: string; status?: string; limit?: number; offset?: number } = {}) {
    const { limit, offset } = normalizePage(query);
    const clauses: string[] = [];
    const args: any[] = [];
    if (query.kind) { clauses.push("kind = ?"); args.push(query.kind); }
    if (query.status) { clauses.push("status = ?"); args.push(query.status); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db.all<any>(`SELECT * FROM entities ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, ...args, limit, offset).map((r) => decode(r));
  }

  getEntity(id: string) {
    const row = this.db.get<any>("SELECT * FROM entities WHERE id=?", id);
    if (!row) throw new NotFoundError("entity", id);
    return decode(row);
  }

  createEntity(input: Record<string, unknown>, actorId: string) {
    const id = optionalString(input, "id", 256) ?? newId("ent");
    const kind = requiredString(input, "kind", 120);
    const name = requiredString(input, "name", 300);
    const metadata = jsonObject(input, "metadata");
    const now = nowIso();
    try {
      return this.db.transaction(() => {
        this.db.run(`INSERT INTO entities(id,kind,name,status,metadata_json,created_at,updated_at) VALUES(?,?,?,'active',?,?,?)`, id, kind, name, toJson(metadata), now, now);
        recordAct(this.db, { actorId, kind: "entity.recognized", objectType: "entity", objectId: id, payload: { id, kind, name, metadata } });
        return this.getEntity(id);
      });
    } catch (error: any) {
      if (String(error?.message).includes("UNIQUE")) throw new ConflictError(`Entity already exists: ${id}`);
      throw error;
    }
  }

  listArtifacts(query: { kind?: string; limit?: number; offset?: number } = {}) {
    const { limit, offset } = normalizePage(query);
    if (query.kind) return this.db.all<any>("SELECT * FROM artifacts WHERE kind=? ORDER BY created_at DESC LIMIT ? OFFSET ?", query.kind, limit, offset).map((r) => decode(r));
    return this.db.all<any>("SELECT * FROM artifacts ORDER BY created_at DESC LIMIT ? OFFSET ?", limit, offset).map((r) => decode(r));
  }

  getArtifact(id: string) {
    const row = this.db.get<any>("SELECT * FROM artifacts WHERE id=?", id);
    if (!row) throw new NotFoundError("artifact", id);
    const artifact = decode(row);
    artifact.versions = this.db.all<any>("SELECT * FROM artifact_versions WHERE artifact_id=? ORDER BY created_at DESC", id).map((r) => decode(r));
    return artifact;
  }

  createArtifact(input: Record<string, unknown>, actorId: string) {
    const id = optionalString(input, "id", 256) ?? newId("art");
    const kind = requiredString(input, "kind", 120);
    const name = requiredString(input, "name", 300);
    const entityId = optionalString(input, "entityId", 256);
    if (entityId) this.getEntity(entityId);
    const description = optionalString(input, "description", 8000);
    const metadata = jsonObject(input, "metadata");
    const now = nowIso();
    return this.db.transaction(() => {
      this.db.run(`INSERT INTO artifacts(id,entity_id,kind,name,description,metadata_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`, id, entityId, kind, name, description, toJson(metadata), now, now);
      recordAct(this.db, { actorId, kind: "artifact.recognized", objectType: "artifact", objectId: id, payload: { id, entityId, kind, name, description, metadata } });
      return this.getArtifact(id);
    });
  }

  addArtifactVersion(artifactId: string, input: Record<string, unknown>, actorId: string) {
    this.getArtifact(artifactId);
    const id = newId("artv");
    const version = requiredString(input, "version", 120);
    const contentDigest = optionalString(input, "contentDigest", 128);
    const sourceUri = optionalString(input, "sourceUri", 2000);
    const revision = optionalString(input, "revision", 500);
    const mediaType = optionalString(input, "mediaType", 200);
    const metadata = jsonObject(input, "metadata");
    const now = nowIso();
    return this.db.transaction(() => {
      this.db.run(`INSERT INTO artifact_versions(id,artifact_id,version,content_digest,source_uri,revision,media_type,metadata_json,created_at) VALUES(?,?,?,?,?,?,?,?,?)`, id, artifactId, version, contentDigest, sourceUri, revision, mediaType, toJson(metadata), now);
      recordAct(this.db, { actorId, kind: "artifact.version.recognized", objectType: "artifact_version", objectId: id, payload: { id, artifactId, version, contentDigest, sourceUri, revision, mediaType, metadata }, evidenceDigest: contentDigest });
      return decode(this.db.get<any>("SELECT * FROM artifact_versions WHERE id=?", id));
    });
  }

  listContracts(limit = 100, offset = 0) {
    return this.db.all<any>("SELECT * FROM contracts ORDER BY created_at DESC LIMIT ? OFFSET ?", limit, offset).map((r) => decode(r));
  }

  createContract(input: Record<string, unknown>, actorId: string) {
    const id = optionalString(input, "id", 256) ?? newId("ctr");
    const kind = requiredString(input, "kind", 120);
    const name = requiredString(input, "name", 300);
    const status = enumValue(input, "status", ["draft", "active", "superseded", "retired"] as const, "draft");
    const documentDigest = optionalString(input, "documentDigest", 128);
    const schemaUri = optionalString(input, "schemaUri", 2000);
    const metadata = jsonObject(input, "metadata");
    const now = nowIso();
    return this.db.transaction(() => {
      this.db.run(`INSERT INTO contracts(id,kind,name,status,document_digest,schema_uri,metadata_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`, id, kind, name, status, documentDigest, schemaUri, toJson(metadata), now, now);
      recordAct(this.db, { actorId, kind: "contract.recognized", objectType: "contract", objectId: id, payload: { id, kind, name, status, documentDigest, schemaUri, metadata }, evidenceDigest: documentDigest });
      return decode(this.db.get<any>("SELECT * FROM contracts WHERE id=?", id));
    });
  }

  createGrant(input: Record<string, unknown>, actorId: string) {
    const id = newId("grt");
    const subjectEntityId = requiredString(input, "subjectEntityId", 256);
    this.getEntity(subjectEntityId);
    const capability = requiredString(input, "capability", 200);
    const resourcePattern = optionalString(input, "resourcePattern", 500) ?? "*";
    const effect = enumValue(input, "effect", ["allow", "deny"] as const, "allow");
    const expiresAt = optionalString(input, "expiresAt", 100);
    const metadata = jsonObject(input, "metadata");
    const now = nowIso();
    return this.db.transaction(() => {
      this.db.run(`INSERT INTO grants(id,subject_entity_id,capability,resource_pattern,effect,status,metadata_json,created_at,expires_at) VALUES(?,?,?,?,?,'active',?,?,?)`, id, subjectEntityId, capability, resourcePattern, effect, toJson(metadata), now, expiresAt);
      recordAct(this.db, { actorId, kind: "grant.issued", objectType: "grant", objectId: id, payload: { id, subjectEntityId, capability, resourcePattern, effect, expiresAt, metadata } });
      return decode(this.db.get<any>("SELECT * FROM grants WHERE id=?", id));
    });
  }

  listGrants(subjectEntityId?: string) {
    const rows = subjectEntityId
      ? this.db.all<any>("SELECT * FROM grants WHERE subject_entity_id=? ORDER BY created_at DESC", subjectEntityId)
      : this.db.all<any>("SELECT * FROM grants ORDER BY created_at DESC LIMIT 200");
    return rows.map((r) => decode(r));
  }

  createAppContract(input: Record<string, unknown>, actorId: string) {
    const id = newId("appc");
    const appEntityId = requiredString(input, "appEntityId", 256);
    this.getEntity(appEntityId);
    const version = requiredString(input, "version", 120);
    const status = enumValue(input, "status", ["draft", "active", "superseded", "retired"] as const, "draft");
    const contract = jsonObject(input, "contract");
    if (!contract.stores && !contract.capabilities && !contract.relationships) {
      throw new ValidationError("App Contract must declare at least stores, capabilities, or relationships");
    }
    const contentDigest = optionalString(input, "contentDigest", 128);
    const now = nowIso();
    return this.db.transaction(() => {
      this.db.run(`INSERT INTO app_contracts(id,app_entity_id,version,status,contract_json,content_digest,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`, id, appEntityId, version, status, toJson(contract), contentDigest, now, now);
      recordAct(this.db, { actorId, kind: "app_contract.recognized", objectType: "app_contract", objectId: id, payload: { id, appEntityId, version, status, contract, contentDigest }, evidenceDigest: contentDigest });
      return decode(this.db.get<any>("SELECT * FROM app_contracts WHERE id=?", id), ["contract_json"]);
    });
  }

  listAppContracts() {
    return this.db.all<any>("SELECT * FROM app_contracts ORDER BY created_at DESC LIMIT 200").map((r) => decode(r, ["contract_json"]));
  }

  createDecision(input: Record<string, unknown>, actorId: string) {
    const id = newId("dec");
    const decision = requiredString(input, "decision", 10000);
    const context = requiredString(input, "context", 20000);
    const ownerEntityId = optionalString(input, "ownerEntityId", 256);
    const consequences = optionalString(input, "consequences", 20000);
    const reversalTrigger = optionalString(input, "reversalTrigger", 10000);
    const options = Array.isArray(input.options) ? input.options : [];
    const evidence = Array.isArray(input.evidence) ? input.evidence : [];
    const now = nowIso();
    return this.db.transaction(() => {
      this.db.run(`INSERT INTO decision_records(id,owner_entity_id,decision,context,options_json,evidence_json,consequences,reversal_trigger,status,version,created_at) VALUES(?,?,?,?,?,?,?,?,'current',1,?)`, id, ownerEntityId, decision, context, toJson(options), toJson(evidence), consequences, reversalTrigger, now);
      recordAct(this.db, { actorId, kind: "decision.recorded", objectType: "decision", objectId: id, payload: { id, ownerEntityId, decision, context, options, evidence, consequences, reversalTrigger } });
      return decode(this.db.get<any>("SELECT * FROM decision_records WHERE id=?", id), ["options_json", "evidence_json"]);
    });
  }

  listDecisions() {
    return this.db.all<any>("SELECT * FROM decision_records ORDER BY created_at DESC LIMIT 200").map((r) => decode(r, ["options_json", "evidence_json"]));
  }

  createIncident(input: Record<string, unknown>, actorId: string) {
    const id = newId("inc");
    const kind = requiredString(input, "kind", 120);
    const title = requiredString(input, "title", 500);
    const impact = requiredString(input, "impact", 12000);
    const ownerEntityId = optionalString(input, "ownerEntityId", 256);
    const actions = Array.isArray(input.actions) ? input.actions : [];
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run(`INSERT INTO incidents(id,kind,title,impact,causal_factors,detection,recovery,missed_signals,actions_json,owner_entity_id,followup_trigger,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,'open',?)`, id, kind, title, impact, optionalString(input,"causalFactors",12000), optionalString(input,"detection",12000), optionalString(input,"recovery",12000), optionalString(input,"missedSignals",12000), toJson(actions), ownerEntityId, optionalString(input,"followupTrigger",12000), now);
      recordAct(this.db, { actorId, kind: "incident.opened", objectType: "incident", objectId: id, payload: { id, kind, title, impact, ownerEntityId, actions } });
    });
    return decode(this.db.get<any>("SELECT * FROM incidents WHERE id=?", id), ["actions_json"]);
  }

  listIncidents() {
    return this.db.all<any>("SELECT * FROM incidents ORDER BY created_at DESC LIMIT 200").map((r) => decode(r, ["actions_json"]));
  }
}
