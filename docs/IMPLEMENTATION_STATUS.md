# Implementation Status

## Implemented and integration-tested

- clean database bootstrap through recorded acts;
- bearer authentication and capability grants;
- Entity / Artifact / ArtifactVersion / Contract / Grant / App Contract records;
- research studies, runs, observations, measurements, findings, claims, evidence links, confidence, conclusions and recommendations;
- SHA-256 content store with read-time and explicit verification;
- benchmark instruments, tasks and test benches;
- temporal and observational evidence signals;
- executable contracts with armed/dormant/retired status, readiness (`T AND O`) evaluated over recorded evidence, `first_match`/`retrigger` policy, idempotent triggers, leased atomic claims, transactional built-in effects, receipts and verification;
- product candidates and promotion;
- decisions, incidents and institutional act history;
- web, API, CLI and MCP surfaces;
- OpenAPI + generated SDK compiler;
- institutional export and act replay for the current recognized act vocabulary.

## Deliberately not invented yet

- global distributed scheduler/event bus;
- automatic triggering when evidence changes (triggers are explicit requests gated by readiness and policy);
- policy terms beyond `first_match`/`retrigger` (hold-for, expiration, retry eligibility, cancellation, compensation);
- arbitrary remote network effects in Continuity;
- proprietary graph language;
- graph database requirement;
- model/provider routing heuristics without Powerfarm evidence;
- external customer tenancy/billing;
- generalized plugin sandbox.

These are not missing boxes to fill automatically. They require an observed decision need and evidence.
