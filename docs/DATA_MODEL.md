# Data Model

## Identity and recognition

- `entities`: stable institutional identities.
- `artifacts`: semantically versionable objects.
- `artifact_versions`: exact versions and content/source identity.
- `contracts`: recognized institutional contracts.
- `grants`: explicit capability authority.
- `app_contracts`: application root contracts.
- `api_tokens`: implementation credentials bound to principal entities.
- `recorded_acts`: ordered history of recognized institutional mutations.

## Research and evidence

- `studies`: decision question, class, unit under test, current belief, resource regime, outcomes, verification, analysis method.
- `study_comparators`: credible alternatives and fairness regimes.
- `runs`: material executions with environment, resource use, route and explicit result state.
- `observations`: what happened or was directly recorded.
- `measurements`: structured observations, including primary outcome flags and verifier identity.
- `scores`: transformations of measurements with an explicit method.
- `findings`: patterns supported by analyzed measurements.
- `claims`: scoped propositions with freshness and supersession.
- `claim_evidence`: supporting, contradicting and contextual evidence relationships.
- `confidence_assessments`: qualitative confidence with rationale and dimensions.
- `conclusions`: interpretation of evidence.
- `recommendations`: suggested action under constraints and retest trigger.

## Benchmarking

- `benchmark_instruments`: version, methodology digest, comparability boundary, contamination strategy.
- `benchmark_tasks`: task identity, exact instructions content reference, success criteria, grader, sequestered state.
- `test_benches`: study-specific evaluation configuration, resource regime and verification.

## Immutable content

- `content_objects`: digest, byte size, media type, object kind, optional manifest, creator, verification timestamp.

The bytes themselves are outside SQLite in the content-addressed object tree.

## Continuity

- `evidence_signals`: temporal/observational evidence available to Powerfarm.
- `execution_routes`: operational intelligence/execution configurations.
- `executable_contracts`: persistent `T`, `O`, `pi`, `E`, `V` terms, generation and status (`draft`, `armed`, `retired`).
- `executions`: trigger, idempotency key, claim owner and time, causal state (`ready`, `claimed`, `executing`, `done`, `failed`, `uncertain`) and failure.
- `execution_receipts`: effect observation plus verification state.
- `outbox`: durable asynchronous delivery intent.

## Operations and products

- `decision_records`
- `incidents`
- `product_candidates`
- `products`
- `publication_records`
