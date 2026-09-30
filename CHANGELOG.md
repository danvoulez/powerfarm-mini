# Changelog

## Unreleased

### Added

- GitHub Actions CI (`.github/workflows/ci.yml`): verify, typecheck, lint, tests and a bootstrap smoke test on every pull request and push to `main`. `pnpm-lock.yaml` pins dependencies for `--frozen-lockfile` installs.

### Fixed

- A request URL with malformed percent-encoding no longer crashes the server; it returns `400`. The URL is parsed without trusting the `Host` header, and the request handler has a last-resort error boundary.
- Continuity `record.act` effects are confined to `continuity.effect.*` acts, so an executable contract can no longer forge a `grant.issued` (or any other recognized) act that export/replay would turn into real state. Legacy contracts with forged kinds now fail at execution.
- The server and worker can write concurrently: SQLite waits up to 5 s for a lock instead of failing with `database is locked`.
- `npm run typecheck` passes. Route handlers get path parameters typed from the route path.
- `npm run replay` reports a missing export directory instead of silently using the working directory.

### Changed

- Continuity now enforces its contract terms (PF-03 Appendix A). Only `armed` contracts trigger; temporal and observational predicates are evaluated over recorded evidence; policy supports `first_match` and `retrigger`. Unsupported terms, effect types and verification types are rejected at creation.
- New operations: `continuity.contracts.status` (arm, disarm, retire) and `continuity.contracts.readiness`. The web console can check readiness, arm and trigger contracts.
- Claims are leased: executions abandoned by a dead worker return to `ready` (never started) or become `uncertain` (possibly materialized), recorded as `execution.lease.expired`.
- Built-in effects commit atomically with their receipt, so a failed execution leaves no partial effect. `Database.transaction` nests via savepoints.
- Evidence signal `observedAt` must be an ISO-8601 timestamp and is normalized to UTC.
- The server refuses to start with the development admin token on a non-loopback host, and no longer prints a configured token.
- Canon filenames no longer carry download suffixes such as `(6)`; contents are unchanged.

## 0.1.0 - 2026-09-30

Initial Powerfarm Platform implementation built from the supplied Powerfarm canon plus EmDash and Forge reference sources.

- Identity / Registry / grants / App Contracts.
- Decision-first Research and Evidence system with explicit epistemic layers.
- Benchmark instruments and test benches.
- SHA-256 immutable content plane.
- Temporal/observational evidence signals.
- Continuity executable contracts and durable execution receipts.
- Productization and publication records.
- Web console, API, CLI, MCP, OpenAPI and generated SDK.
- Ordered institutional acts, export and replay.
