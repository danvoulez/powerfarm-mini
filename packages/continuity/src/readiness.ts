import type { Database } from "../../db/src/database.ts";
import { fromJson } from "../../core/src/json.ts";
import { ValidationError } from "../../core/src/errors.ts";

// PF-03 Appendix A: Ready_c = T_c(t_hat) AND O_c(w_hat), evaluated over the evidence available to
// Powerfarm; Trigger_c = pi_c(Ready_c, H_c). Only the terms below are recognized. Anything else is
// rejected when a contract is created, so a stored term is never silently left unenforced.
//
// Predicate terms (both domains unless noted):
//   {} | { type: "always" }                          always admissible
//   { type: "all", of: [predicate, ...] }             conjunction
//   { type: "signal", kind, subject?, withinSeconds?, equals? }
//                                                     the latest evidence signal of `kind` (and `subject`)
//                                                     in the predicate's own domain exists, is no older than
//                                                     `withinSeconds`, and has a value equal to `equals`
//   { type: "window", notBefore?, notAfter? }         temporal only: platform clock reading inside the window
//   { type: "manual" }                                observational only: the explicit trigger request is the
//                                                     observed arrival (the canon's webhook degenerate case)
//
// Policy terms:
//   {} | { mode: "retrigger" }                        every ready trigger request produces an execution
//   { mode: "first_match" }                           only the first trigger for a contract generation does

export type EvidenceDomain = "temporal" | "observational";
export type PolicyMode = "retrigger" | "first_match";
export type ReadinessState = "dormant" | "retired" | "waiting_temporal" | "waiting_observation" | "waiting_both" | "ready";

export interface PredicateResult {
  satisfied: boolean;
  reason: string;
  /** IDs of the evidence signals the evaluation relied on. */
  evidence: string[];
}

export interface Readiness {
  state: ReadinessState;
  ready: boolean;
  /** t_hat is the platform clock reading; recorded so it is never an assumed omniscient time. */
  clock: { source: "platform-clock"; at: string };
  temporal: PredicateResult;
  observational: PredicateResult;
}

export interface PolicyDecision {
  mode: PolicyMode;
  trigger: boolean;
  reason: string;
}

export interface EvaluationContext {
  now: Date;
  /** True when an explicit trigger request is being evaluated (satisfies `manual`). */
  triggerRequested: boolean;
}

type Json = Record<string, unknown>;

const predicateKeys: Record<string, string[]> = {
  always: ["type"],
  all: ["type", "of"],
  signal: ["type", "kind", "subject", "withinSeconds", "equals"],
  window: ["type", "notBefore", "notAfter"],
  manual: ["type"],
};
const domainOnly: Record<string, EvidenceDomain> = { window: "temporal", manual: "observational" };
const policyModes: readonly PolicyMode[] = ["retrigger", "first_match"];

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIso(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function validatePredicate(value: unknown, domain: EvidenceDomain, path: string): void {
  if (!isObject(value)) throw new ValidationError(`${path} must be an object`);
  if (Object.keys(value).length === 0) return;
  const type = value.type;
  if (typeof type !== "string" || !(type in predicateKeys)) {
    throw new ValidationError(`${path}.type must be one of: ${Object.keys(predicateKeys).join(", ")}`);
  }
  const only = domainOnly[type];
  if (only && only !== domain) throw new ValidationError(`${path}.type "${type}" is only valid in the ${only} predicate`);
  const unknown = Object.keys(value).filter((key) => !predicateKeys[type]!.includes(key));
  if (unknown.length) throw new ValidationError(`${path} has unsupported keys: ${unknown.join(", ")}`);
  switch (type) {
    case "all":
      if (!Array.isArray(value.of) || value.of.length === 0) throw new ValidationError(`${path}.of must be a non-empty array`);
      value.of.forEach((child, i) => validatePredicate(child, domain, `${path}.of[${i}]`));
      break;
    case "signal":
      if (typeof value.kind !== "string" || !value.kind.trim()) throw new ValidationError(`${path}.kind is required`);
      if (value.subject !== undefined && typeof value.subject !== "string") throw new ValidationError(`${path}.subject must be a string`);
      if (value.withinSeconds !== undefined && !(typeof value.withinSeconds === "number" && value.withinSeconds > 0)) {
        throw new ValidationError(`${path}.withinSeconds must be a positive number`);
      }
      break;
    case "window":
      if (value.notBefore === undefined && value.notAfter === undefined) throw new ValidationError(`${path} needs notBefore and/or notAfter`);
      for (const key of ["notBefore", "notAfter"]) {
        if (value[key] !== undefined && !isIso(value[key])) throw new ValidationError(`${path}.${key} must be an ISO-8601 timestamp`);
      }
      break;
  }
}

export function validatePolicy(value: unknown): void {
  if (!isObject(value)) throw new ValidationError("policy must be an object");
  const unknown = Object.keys(value).filter((key) => key !== "mode");
  if (unknown.length) throw new ValidationError(`policy has unsupported keys: ${unknown.join(", ")}`);
  if (value.mode !== undefined && !policyModes.includes(value.mode as PolicyMode)) {
    throw new ValidationError(`policy.mode must be one of: ${policyModes.join(", ")}`);
  }
}

/** Order-insensitive structural equality for JSON values. */
function sameJson(a: unknown, b: unknown): boolean {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (isObject(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
    return value;
  };
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function evaluatePredicate(db: Database, predicate: unknown, domain: EvidenceDomain, context: EvaluationContext): PredicateResult {
  // Fail closed: contracts stored before validation existed may hold terms this evaluator does not know.
  try {
    validatePredicate(predicate, domain, domain);
  } catch (error: any) {
    return { satisfied: false, reason: `unsupported predicate: ${error.message}`, evidence: [] };
  }
  const p = predicate as Json;
  const type = Object.keys(p).length === 0 ? "always" : String(p.type);
  switch (type) {
    case "always":
      return { satisfied: true, reason: "always admissible", evidence: [] };
    case "manual":
      return context.triggerRequested
        ? { satisfied: true, reason: "explicit trigger request observed", evidence: [] }
        : { satisfied: false, reason: "awaits an explicit trigger request", evidence: [] };
    case "window": {
      const now = context.now.getTime();
      if (p.notBefore !== undefined && now < Date.parse(String(p.notBefore))) return { satisfied: false, reason: `window opens at ${p.notBefore}`, evidence: [] };
      if (p.notAfter !== undefined && now > Date.parse(String(p.notAfter))) return { satisfied: false, reason: `window closed at ${p.notAfter}`, evidence: [] };
      return { satisfied: true, reason: "inside temporal window", evidence: [] };
    }
    case "signal": {
      const kind = String(p.kind);
      const subject = typeof p.subject === "string" ? p.subject : null;
      const signal = subject === null
        ? db.get<any>("SELECT * FROM evidence_signals WHERE domain=? AND kind=? ORDER BY observed_at DESC, rowid DESC LIMIT 1", domain, kind)
        : db.get<any>("SELECT * FROM evidence_signals WHERE domain=? AND kind=? AND subject=? ORDER BY observed_at DESC, rowid DESC LIMIT 1", domain, kind, subject);
      const label = subject === null ? `"${kind}"` : `"${kind}" for ${subject}`;
      if (!signal) return { satisfied: false, reason: `no ${domain} evidence ${label}`, evidence: [] };
      const evidence = [String(signal.id)];
      if (typeof p.withinSeconds === "number") {
        const observedAt = Date.parse(signal.observed_at);
        if (Number.isNaN(observedAt) || context.now.getTime() - observedAt > p.withinSeconds * 1000) {
          return { satisfied: false, reason: `latest ${domain} evidence ${label} is older than ${p.withinSeconds}s`, evidence };
        }
      }
      if ("equals" in p && !sameJson(fromJson(signal.value_json), p.equals)) {
        return { satisfied: false, reason: `latest ${domain} evidence ${label} does not have the required value`, evidence };
      }
      return { satisfied: true, reason: `${domain} evidence ${label} observed at ${signal.observed_at}`, evidence };
    }
    case "all": {
      const results = (p.of as unknown[]).map((child) => evaluatePredicate(db, child, domain, context));
      const failed = results.filter((result) => !result.satisfied);
      return {
        satisfied: failed.length === 0,
        reason: failed.length ? failed.map((result) => result.reason).join("; ") : results.map((result) => result.reason).join("; "),
        evidence: results.flatMap((result) => result.evidence),
      };
    }
    default:
      return { satisfied: false, reason: `unsupported predicate type: ${type}`, evidence: [] };
  }
}

export function evaluateReadiness(db: Database, contract: any, context: EvaluationContext): Readiness {
  const clock = { source: "platform-clock" as const, at: context.now.toISOString() };
  const temporal = evaluatePredicate(db, contract.temporal_predicate ?? {}, "temporal", context);
  const observational = evaluatePredicate(db, contract.observational_predicate ?? {}, "observational", context);
  let state: ReadinessState;
  if (contract.status === "draft") state = "dormant";
  else if (contract.status !== "armed") state = "retired";
  else if (!temporal.satisfied && !observational.satisfied) state = "waiting_both";
  else if (!temporal.satisfied) state = "waiting_temporal";
  else if (!observational.satisfied) state = "waiting_observation";
  else state = "ready";
  return { state, ready: state === "ready", clock, temporal, observational };
}

export function decidePolicy(db: Database, contract: any): PolicyDecision {
  const policy = isObject(contract.policy) ? contract.policy : {};
  const mode = (policy.mode ?? "retrigger") as PolicyMode;
  if (!policyModes.includes(mode)) return { mode, trigger: false, reason: `unsupported policy mode: ${String(mode)}` };
  if (mode === "first_match") {
    const prior = db.get<{ id: string }>("SELECT id FROM executions WHERE contract_id=? AND contract_generation=? ORDER BY created_at LIMIT 1", contract.id, contract.generation);
    if (prior) return { mode, trigger: false, reason: `first_match: generation ${contract.generation} already triggered execution ${prior.id}` };
    return { mode, trigger: true, reason: "first_match: first trigger for this generation" };
  }
  return { mode, trigger: true, reason: "retrigger: every ready trigger request executes" };
}
