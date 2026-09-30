import type { Database } from "../../db/src/database.ts";
import { newId } from "../../core/src/ids.ts";
import { nowIso } from "../../core/src/time.ts";
import { fromJson, toJson } from "../../core/src/json.ts";
import { NotFoundError, ValidationError } from "../../core/src/errors.ts";
import { booleanValue, enumValue, jsonObject, numberValue, optionalString, requiredString } from "../../core/src/validate.ts";
import { normalizePage } from "../../core/src/page.ts";
import { recordAct } from "../../institution/src/acts.ts";
import { confidenceLevels, evidenceStances, resultStates, studyClasses } from "./constants.ts";

function decode(row: any, jsonFields: string[] = []): any {
  if (!row) return row;
  const out = { ...row };
  for (const field of jsonFields) {
    out[field.replace(/_json$/, "")] = fromJson(out[field], field.includes("outcomes") ? [] : {});
    delete out[field];
  }
  for (const key of ["is_primary"]) if (key in out) out[key] = Boolean(out[key]);
  return out;
}

export class ResearchService {
  readonly db: Database;
  constructor(db: Database) { this.db = db; }

  listStudies(query: { status?: string; studyClass?: string; limit?: number; offset?: number } = {}) {
    const { limit, offset } = normalizePage(query);
    const where: string[] = []; const args: any[] = [];
    if (query.status) { where.push("status=?"); args.push(query.status); }
    if (query.studyClass) { where.push("study_class=?"); args.push(query.studyClass); }
    const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
    return this.db.all<any>(`SELECT * FROM studies ${sqlWhere} ORDER BY created_at DESC LIMIT ? OFFSET ?`, ...args, limit, offset)
      .map((r) => decode(r, ["unit_under_test_json", "resource_regime_json", "primary_outcomes_json"]));
  }

  getStudy(id: string) {
    const row = this.db.get<any>("SELECT * FROM studies WHERE id=?", id);
    if (!row) throw new NotFoundError("study", id);
    const study = decode(row, ["unit_under_test_json", "resource_regime_json", "primary_outcomes_json"]);
    study.comparators = this.db.all<any>("SELECT * FROM study_comparators WHERE study_id=? ORDER BY created_at", id).map((r) => decode(r, ["configuration_json"]));
    study.runs = this.db.all<any>("SELECT * FROM runs WHERE study_id=? ORDER BY started_at DESC", id).map((r) => decode(r, ["environment_json", "resource_usage_json", "route_json"]));
    study.findings = this.db.all<any>("SELECT * FROM findings WHERE study_id=? ORDER BY created_at", id).map((r) => decode(r, ["analysis_json"]));
    study.claims = this.db.all<any>("SELECT * FROM claims WHERE study_id=? ORDER BY created_at DESC", id).map((r) => decode(r));
    study.recommendations = this.db.all<any>("SELECT * FROM recommendations WHERE study_id=? ORDER BY created_at DESC", id).map((r) => decode(r, ["constraints_json"]));
    return study;
  }

  createStudy(input: Record<string, unknown>, actorId: string) {
    const id = newId("std");
    const title = requiredString(input, "title", 500);
    const decisionQuestion = requiredString(input, "decisionQuestion", 12000);
    const studyClass = enumValue(input, "studyClass", studyClasses, "exploratory");
    const currentBelief = optionalString(input, "currentBelief", 20000);
    const currentConfidence = optionalString(input, "currentConfidence", 120);
    const unitUnderTest = jsonObject(input, "unitUnderTest");
    const hypothesis = optionalString(input, "hypothesis", 12000);
    const resourceRegime = jsonObject(input, "resourceRegime");
    const primaryOutcomes = Array.isArray(input.primaryOutcomes) ? input.primaryOutcomes : [];
    const verificationPlan = optionalString(input, "verificationPlan", 20000);
    const analysisMethod = optionalString(input, "analysisMethod", 20000);
    const ownerEntityId = optionalString(input, "ownerEntityId", 256);
    const now = nowIso();
    return this.db.transaction(() => {
      this.db.run(`INSERT INTO studies(id,title,decision_question,current_belief,current_confidence,study_class,unit_under_test_json,hypothesis,resource_regime_json,primary_outcomes_json,verification_plan,analysis_method,status,owner_entity_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'planned',?,?,?)`, id, title, decisionQuestion, currentBelief, currentConfidence, studyClass, toJson(unitUnderTest), hypothesis, toJson(resourceRegime), toJson(primaryOutcomes), verificationPlan, analysisMethod, ownerEntityId, now, now);
      recordAct(this.db, { actorId, kind: "study.created", objectType: "study", objectId: id, payload: { id, title, decisionQuestion, studyClass, currentBelief, currentConfidence, unitUnderTest, hypothesis, resourceRegime, primaryOutcomes, verificationPlan, analysisMethod, ownerEntityId } });
      return this.getStudy(id);
    });
  }

  updateStudyStatus(id: string, status: string, actorId: string) {
    this.getStudy(id);
    const allowed = ["planned", "running", "analysis", "complete", "cancelled"];
    if (!allowed.includes(status)) throw new ValidationError(`status must be one of ${allowed.join(", ")}`);
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run("UPDATE studies SET status=?, updated_at=?, completed_at=? WHERE id=?", status, now, status === "complete" ? now : null, id);
      recordAct(this.db, { actorId, kind: "study.status.changed", objectType: "study", objectId: id, payload: { status } });
    });
    return this.getStudy(id);
  }

  addComparator(studyId: string, input: Record<string, unknown>, actorId: string) {
    this.getStudy(studyId);
    const id = newId("cmp");
    const label = requiredString(input, "label", 500);
    const configuration = jsonObject(input, "configuration");
    const fairnessRegime = optionalString(input, "fairnessRegime", 4000);
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run("INSERT INTO study_comparators(id,study_id,label,configuration_json,fairness_regime,created_at) VALUES(?,?,?,?,?,?)", id, studyId, label, toJson(configuration), fairnessRegime, now);
      recordAct(this.db, { actorId, kind: "study.comparator.added", objectType: "study_comparator", objectId: id, payload: { id, studyId, label, configuration, fairnessRegime } });
    });
    return decode(this.db.get<any>("SELECT * FROM study_comparators WHERE id=?", id), ["configuration_json"]);
  }

  createRun(studyId: string, input: Record<string, unknown>, actorId: string) {
    this.getStudy(studyId);
    const id = newId("run");
    const comparatorId = optionalString(input, "comparatorId", 256);
    const environment = jsonObject(input, "environment");
    const resourceUsage = jsonObject(input, "resourceUsage");
    const route = jsonObject(input, "route");
    const startedAt = optionalString(input, "startedAt", 100) ?? nowIso();
    this.db.transaction(() => {
      this.db.run(`INSERT INTO runs(id,study_id,comparator_id,result_state,environment_json,resource_usage_json,route_json,started_at) VALUES(?,?,?,'incomplete',?,?,?,?)`, id, studyId, comparatorId, toJson(environment), toJson(resourceUsage), toJson(route), startedAt);
      this.db.run("UPDATE studies SET status='running', updated_at=? WHERE id=? AND status='planned'", nowIso(), studyId);
      recordAct(this.db, { actorId, kind: "run.started", objectType: "run", objectId: id, payload: { id, studyId, comparatorId, environment, resourceUsage, route, startedAt } });
    });
    return this.getRun(id);
  }

  getRun(id: string) {
    const row = this.db.get<any>("SELECT * FROM runs WHERE id=?", id);
    if (!row) throw new NotFoundError("run", id);
    const run = decode(row, ["environment_json", "resource_usage_json", "route_json"]);
    run.observations = this.db.all<any>("SELECT * FROM observations WHERE run_id=? ORDER BY observed_at", id).map((r) => decode(r, ["value_json", "metadata_json"]));
    run.measurements = this.db.all<any>("SELECT * FROM measurements WHERE run_id=? ORDER BY measured_at", id).map((r) => decode(r, ["metadata_json"]));
    return run;
  }

  completeRun(id: string, input: Record<string, unknown>, actorId: string) {
    this.getRun(id);
    const resultState = enumValue(input, "resultState", resultStates, "valid_success");
    const notes = optionalString(input, "notes", 20000);
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run("UPDATE runs SET result_state=?, notes=?, completed_at=? WHERE id=?", resultState, notes, now, id);
      recordAct(this.db, { actorId, kind: "run.completed", objectType: "run", objectId: id, payload: { resultState, notes, completedAt: now } });
    });
    return this.getRun(id);
  }

  addObservation(runId: string, input: Record<string, unknown>, actorId: string) {
    this.getRun(runId);
    const id = newId("obs");
    const kind = requiredString(input, "kind", 200);
    if (!("value" in input)) throw new ValidationError("value is required");
    const value = input.value;
    const observedAt = optionalString(input, "observedAt", 100) ?? nowIso();
    const sourceDigest = optionalString(input, "sourceDigest", 128);
    const metadata = jsonObject(input, "metadata");
    this.db.transaction(() => {
      this.db.run("INSERT INTO observations(id,run_id,kind,value_json,observed_at,source_digest,metadata_json) VALUES(?,?,?,?,?,?,?)", id, runId, kind, toJson(value), observedAt, sourceDigest, toJson(metadata));
      recordAct(this.db, { actorId, kind: "observation.recorded", objectType: "observation", objectId: id, payload: { id, runId, kind, value, observedAt, sourceDigest, metadata }, evidenceDigest: sourceDigest });
    });
    return decode(this.db.get<any>("SELECT * FROM observations WHERE id=?", id), ["value_json", "metadata_json"]);
  }

  addMeasurement(runId: string, input: Record<string, unknown>, actorId: string) {
    this.getRun(runId);
    const id = newId("msr");
    const metric = requiredString(input, "metric", 300);
    const valueNumber = typeof input.valueNumber === "number" ? numberValue(input, "valueNumber") : null;
    const valueText = optionalString(input, "valueText", 10000);
    if (valueNumber === null && valueText === null) throw new ValidationError("valueNumber or valueText is required");
    const unit = optionalString(input, "unit", 120);
    const isPrimary = booleanValue(input, "isPrimary", false);
    const verifier = optionalString(input, "verifier", 1000);
    const observationId = optionalString(input, "observationId", 256);
    const metadata = jsonObject(input, "metadata");
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run("INSERT INTO measurements(id,run_id,observation_id,metric,value_number,value_text,unit,is_primary,verifier,measured_at,metadata_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)", id, runId, observationId, metric, valueNumber, valueText, unit, isPrimary ? 1 : 0, verifier, now, toJson(metadata));
      recordAct(this.db, { actorId, kind: "measurement.recorded", objectType: "measurement", objectId: id, payload: { id, runId, observationId, metric, valueNumber, valueText, unit, isPrimary, verifier, metadata } });
    });
    return decode(this.db.get<any>("SELECT * FROM measurements WHERE id=?", id), ["metadata_json"]);
  }

  addFinding(studyId: string, input: Record<string, unknown>, actorId: string) {
    this.getStudy(studyId);
    const id = newId("fnd");
    const statement = requiredString(input, "statement", 20000);
    const analysis = jsonObject(input, "analysis");
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run("INSERT INTO findings(id,study_id,statement,analysis_json,created_at) VALUES(?,?,?,?,?)", id, studyId, statement, toJson(analysis), now);
      recordAct(this.db, { actorId, kind: "finding.recorded", objectType: "finding", objectId: id, payload: { id, studyId, statement, analysis } });
    });
    return decode(this.db.get<any>("SELECT * FROM findings WHERE id=?", id), ["analysis_json"]);
  }

  listClaims(query: { status?: string; limit?: number; offset?: number } = {}) {
    const { limit, offset } = normalizePage(query);
    const rows = query.status
      ? this.db.all<any>("SELECT * FROM claims WHERE status=? ORDER BY created_at DESC LIMIT ? OFFSET ?", query.status, limit, offset)
      : this.db.all<any>("SELECT * FROM claims ORDER BY created_at DESC LIMIT ? OFFSET ?", limit, offset);
    return rows.map((r) => decode(r));
  }

  getClaim(id: string) {
    const row = this.db.get<any>("SELECT * FROM claims WHERE id=?", id);
    if (!row) throw new NotFoundError("claim", id);
    const claim = decode(row);
    claim.evidence = this.db.all<any>("SELECT * FROM claim_evidence WHERE claim_id=? ORDER BY created_at", id);
    claim.confidence = this.db.all<any>("SELECT * FROM confidence_assessments WHERE claim_id=? ORDER BY created_at DESC", id).map((r) => decode(r, ["dimensions_json"]));
    return claim;
  }

  createClaim(input: Record<string, unknown>, actorId: string) {
    const id = newId("clm");
    const studyId = optionalString(input, "studyId", 256);
    if (studyId) this.getStudy(studyId);
    const statement = requiredString(input, "statement", 30000);
    const scope = requiredString(input, "scope", 20000);
    const status = enumValue(input, "status", ["provisional", "current", "superseded", "rejected"] as const, "provisional");
    const reviewTrigger = optionalString(input, "reviewTrigger", 12000);
    const observedThrough = optionalString(input, "observedThrough", 100);
    const supersedesId = optionalString(input, "supersedesId", 256);
    const now = nowIso();
    return this.db.transaction(() => {
      if (supersedesId) this.db.run("UPDATE claims SET status='superseded', updated_at=? WHERE id=?", now, supersedesId);
      this.db.run("INSERT INTO claims(id,study_id,statement,scope,status,freshness_state,review_trigger,observed_through,created_at,updated_at,supersedes_id) VALUES(?,?,?,?,?,'current',?,?,?,?,?)", id, studyId, statement, scope, status, reviewTrigger, observedThrough, now, now, supersedesId);
      recordAct(this.db, { actorId, kind: "claim.recorded", objectType: "claim", objectId: id, payload: { id, studyId, statement, scope, status, reviewTrigger, observedThrough, supersedesId } });
      return this.getClaim(id);
    });
  }

  attachClaimEvidence(claimId: string, input: Record<string, unknown>, actorId: string) {
    this.getClaim(claimId);
    const id = newId("cev");
    const evidenceKind = requiredString(input, "evidenceKind", 120);
    const evidenceId = requiredString(input, "evidenceId", 256);
    const stance = enumValue(input, "stance", evidenceStances);
    const notes = optionalString(input, "notes", 12000);
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run("INSERT INTO claim_evidence(id,claim_id,evidence_kind,evidence_id,stance,notes,created_at) VALUES(?,?,?,?,?,?,?)", id, claimId, evidenceKind, evidenceId, stance, notes, now);
      recordAct(this.db, { actorId, kind: "claim.evidence.linked", objectType: "claim_evidence", objectId: id, payload: { id, claimId, evidenceKind, evidenceId, stance, notes } });
    });
    return this.db.get<any>("SELECT * FROM claim_evidence WHERE id=?", id);
  }

  assessConfidence(claimId: string, input: Record<string, unknown>, actorId: string) {
    this.getClaim(claimId);
    const id = newId("cnf");
    const level = enumValue(input, "level", confidenceLevels);
    const rationale = requiredString(input, "rationale", 20000);
    const dimensions = jsonObject(input, "dimensions");
    const assessedBy = optionalString(input, "assessedBy", 256) ?? actorId;
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run("INSERT INTO confidence_assessments(id,claim_id,level,rationale,dimensions_json,assessed_by,created_at) VALUES(?,?,?,?,?,?,?)", id, claimId, level, rationale, toJson(dimensions), assessedBy, now);
      recordAct(this.db, { actorId, kind: "claim.confidence.assessed", objectType: "confidence_assessment", objectId: id, payload: { id, claimId, level, rationale, dimensions, assessedBy } });
    });
    return decode(this.db.get<any>("SELECT * FROM confidence_assessments WHERE id=?", id), ["dimensions_json"]);
  }

  createConclusion(studyId: string, input: Record<string, unknown>, actorId: string) {
    this.getStudy(studyId);
    const id = newId("con");
    const interpretation = requiredString(input, "interpretation", 30000);
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run("INSERT INTO conclusions(id,study_id,interpretation,created_at) VALUES(?,?,?,?)", id, studyId, interpretation, now);
      recordAct(this.db, { actorId, kind: "conclusion.recorded", objectType: "conclusion", objectId: id, payload: { id, studyId, interpretation } });
    });
    return this.db.get<any>("SELECT * FROM conclusions WHERE id=?", id);
  }

  createRecommendation(input: Record<string, unknown>, actorId: string) {
    const id = newId("rec");
    const studyId = optionalString(input, "studyId", 256);
    const claimId = optionalString(input, "claimId", 256);
    if (!studyId && !claimId) throw new ValidationError("studyId or claimId is required");
    if (studyId) this.getStudy(studyId);
    if (claimId) this.getClaim(claimId);
    const action = requiredString(input, "action", 30000);
    const constraints = jsonObject(input, "constraints");
    const retestTrigger = optionalString(input, "retestTrigger", 12000);
    const supersedesId = optionalString(input, "supersedesId", 256);
    const now = nowIso();
    return this.db.transaction(() => {
      if (supersedesId) this.db.run("UPDATE recommendations SET status='superseded' WHERE id=?", supersedesId);
      this.db.run("INSERT INTO recommendations(id,study_id,claim_id,action,constraints_json,status,retest_trigger,created_at,supersedes_id) VALUES(?,?,?,?,?,'current',?,?,?)", id, studyId, claimId, action, toJson(constraints), retestTrigger, now, supersedesId);
      recordAct(this.db, { actorId, kind: "recommendation.recorded", objectType: "recommendation", objectId: id, payload: { id, studyId, claimId, action, constraints, retestTrigger, supersedesId } });
      return decode(this.db.get<any>("SELECT * FROM recommendations WHERE id=?", id), ["constraints_json"]);
    });
  }

  listRecommendations() {
    return this.db.all<any>("SELECT * FROM recommendations ORDER BY created_at DESC LIMIT 200").map((r) => decode(r, ["constraints_json"]));
  }
}
