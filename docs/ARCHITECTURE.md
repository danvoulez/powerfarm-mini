# Powerfarm Platform Architecture v0.1

## Purpose

Powerfarm Platform is the current materialization of the institutional architecture described by PF-01 through PF-05. It is intentionally larger than a research notebook and intentionally smaller than an invented universal operating system. Its job is to make Powerfarm's existing semantics executable, inspectable, and useful every day.

The implementation is replaceable. The contracts and evidence semantics are the durable part.

## Sectors

### Identity

Identity answers what Powerfarm recognizes and who or what is authorized to act. The current implementation includes:

- `entities`
- `artifacts`
- `artifact_versions`
- `contracts`
- `grants`
- `app_contracts`
- API principals/tokens as implementation credentials
- ordered `recorded_acts`

Registry is a service within this sector. It does not own arbitrary application state.

### Research

Research preserves the decision-first research lifecycle and keeps epistemic layers distinct:

```text
Study
  -> Run
     -> Observation
        -> Measurement
  -> Finding
  -> Claim
     -> supporting / contradicting evidence
     -> ConfidenceAssessment[]
  -> Conclusion
  -> Recommendation
```

A measurement cannot silently become a recommendation. Confidence attaches to a scoped claim and has its own history.

Benchmark instruments and test benches are explicit objects because a benchmark is a versioned measurement instrument and a test bench is the evaluation configuration used to answer a decision question.

### Continuity

Continuity implements the causal execution chain without requiring a heavyweight workflow platform:

```text
temporal evidence + observational evidence
              |
          predicates
              |
           readiness
              |
            policy
              |
           trigger
              |
        atomic claim
              |
        materialization
              |
           receipt
              |
        verification
```

Executable contracts persist the semantic core `C=(T,O,pi,E,V)`. The worker's storage/locking mechanism is an implementation detail.

`packages/continuity/src/readiness.ts` implements PF-03 Appendix A:

- A contract is `draft` (dormant), `armed`, or `retired` (terminal). Only an armed contract can trigger.
- `Ready = T AND O`, evaluated over recorded evidence signals. The platform clock reading used as `t_hat` is recorded with every evaluation rather than assumed.
- Predicate terms: `always` (or `{}`), `all` (conjunction), `signal` (latest evidence of a kind/subject in the predicate's own domain, optionally no older than `withinSeconds` and equal to `equals`), `window` (temporal only: `notBefore`/`notAfter`), and `manual` (observational only: the explicit trigger request is the observed arrival).
- Policy `pi`: `retrigger` (default) or `first_match` (one trigger per contract generation).
- Unsupported terms are rejected when the contract is created; a stored term that is not understood evaluates as unsatisfied.

A trigger request runs readiness, policy and execution creation in one transaction, and the `execution.triggered` act records the readiness and policy verdict that justified it. A refused trigger returns `409` with the readiness in `details`. `GET /api/v1/executable-contracts/:id/readiness` shows the current state (`dormant`, `waiting_temporal`, `waiting_observation`, `waiting_both`, `ready`, `retired`).

Triggers are explicit requests; the platform does not yet evaluate contracts on its own when evidence arrives.

Claims are leased. The next claim recovers any execution whose worker has been silent for five minutes: a `claimed` execution never started its effect and returns to `ready`; an `executing` one may have materialized and becomes `uncertain`. Both are recorded as `execution.lease.expired` acts.

## State and storage

### Relational operational state

SQLite is the current local operational store. The schema makes domain ownership explicit. SQLite is not institutional identity and can be replaced if evidence supports another substrate.

### Immutable content plane

`packages/evidence` stores bytes by SHA-256 under `var/objects/sha256/<prefix>/<digest>`. Database rows contain content metadata and relationships; the digest identifies exact bytes.

Knowing a digest is not an authority grant.

### Institutional acts

Material mutations write a `recorded_act` in the same transaction as recognized state. The act contains actor, operation kind, object identity, material payload, evidence digest when applicable, and timestamp.

`export-institution.ts` produces a portable bundle. `replay-institution.ts` reconstructs supported recognized state from the ordered act stream and restores immutable bytes.

## Interfaces

All interfaces use the same domain services:

```text
web console ------\
CLI ---------------+--> HTTP/domain operations --> services --> stores
MCP ---------------/
generated SDK ----/
```

MCP is an interface, not a second domain model. The web console is a projection, not an authority.

## API contracts and generation

The HTTP route registry contains operation IDs, summaries, tags and required capabilities. OpenAPI 3.1 is derived mechanically from the route registry.

The compiler then applies a separate Powerfarm overlay and emits:

- `generated/openapi.json`
- `generated/operations.json`
- `generated/capabilities.json`
- `generated/sdk.mjs`

This preserves a clean seam between API truth and generated developer ergonomics.

## Authority

Authentication and authorization are separate:

- bearer tokens identify a principal;
- grants authorize capabilities;
- routes declare required capabilities;
- the bootstrap local administrator is an explicit development exception.

Capability names are narrow domain verbs such as `research:write`, `registry:read`, and `continuity:execute` rather than generic administrator flags.

## Current effect boundary

Continuity deliberately supports only a small safe effect registry today:

- `noop`
- `record.act`
- `content.put-json`

`record.act` may only record acts whose kind starts with `continuity.effect.`. Replay never interprets that namespace, so an effect cannot forge a grant, entity or other recognized mutation.

Each built-in effect is local to the database (plus idempotent content-addressed bytes), so the effect, its verification and its receipt commit or roll back together. A failed execution therefore leaves no partial effect behind.

Network effects are not enabled by default. Adding one requires an explicit security and authority model rather than an arbitrary URL field. Such an effect cannot share the receipt transaction: it must commit `executing` before acting, so an expired lease resolves it to `uncertain` rather than retrying it blindly.

## Replaceability boundaries

The current implementation may change without redefining Powerfarm when the change preserves:

- identity semantics;
- contract authority;
- content identity;
- epistemic layer separation;
- provenance;
- execution causality;
- verification semantics;
- historical reconstructability.
