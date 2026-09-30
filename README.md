# Powerfarm Platform

A runnable institutional platform for Powerfarm: research evidence, identity and recognition, immutable content, causal execution, products, decisions, incidents, API/CLI/MCP interfaces, and reconstructable institutional history.

This repository is an **implementation of the Powerfarm canon**, not a replacement for it. The current runtime may be replaced while the durable semantics remain.

## What works now

- **Identity / Registry**: entities, artifacts, artifact versions, contracts, grants, App Contracts, API principals.
- **Research / Evidence**: studies, comparators, runs, observations, measurements, scores, findings, claims, supporting and contradicting evidence, confidence assessments, conclusions, recommendations.
- **Benchmarks**: versioned instruments, benchmark tasks, contamination/comparability metadata, test benches.
- **Immutable content**: SHA-256 addressed byte store with verification and metadata.
- **Continuity**: executable contracts `C=(T,O,π,E,V)`, durable triggers, atomic worker claims, effects, receipts, verification, and uncertainty.
- **Temporal / observational evidence**: explicit evidence signals rather than assumed perfect time/world state.
- **Institutional operations**: decision records, incidents, ordered recorded acts, export and replay.
- **Products**: candidates and promotion through an explicit productization record.
- **Interfaces**: web console, HTTP API, generated OpenAPI 3.1, CLI, MCP server, generated JavaScript SDK.
- **Search**: federated read projection over recognized institutional state.

## Run it

Requirements: Node.js 22.16 or newer. The core runtime has no third-party package dependency.

```bash
npm run migrate
npm run seed
npm run dev
```

Open <http://127.0.0.1:4545>.

The local development bearer token is:

```text
powerfarm-local-admin
```

Override it before any shared deployment:

```bash
export POWERFARM_ADMIN_TOKEN='a-long-random-secret'
```

## Other surfaces

```bash
# CLI
npm run cli -- dashboard
npm run cli -- studies list
npm run cli -- search "execution route"

# MCP stdio server
npm run mcp

# Continuity worker
npm run worker

# Generate OpenAPI, operation catalog and SDK
npm run generate

# Verify source shape and run integration tests
npm run verify
npm test
```

## Preserve and rebuild an institution

```bash
npm run export -- ./var/export
npm run replay -- ./var/export ./var/replayed.db ./var/replayed-objects
```

An export carries ordered institutional acts, canonical documents, content metadata, and immutable object bytes. Replay applies the recognized act vocabulary to a fresh database.

## Repository map

```text
apps/
  server/       HTTP server + route registry
  web/          operator console
  cli/          command-line client
  mcp/          MCP stdio server
packages/
  api/          routing + OpenAPI derivation
  auth/         principals, capabilities, bearer tokens
  benchmarks/   benchmark instruments and test benches
  canon/        canonical document reader
  compiler/     overlay + generated surface compiler
  continuity/   executable contracts, evidence signals, durable execution
  core/         IDs, errors, JSON, hashing, validation
  db/           SQLite schema and database boundary
  evidence/     content-addressed immutable store
  institution/  Registry, contracts, grants, acts, replay
  products/     product candidates and maintained products
  research/     studies and epistemic layers
  search/       federated read projection
canon/          PF-01 through PF-05, verbatim source documents
contracts/      overlays and machine-facing contract material
docs/           architecture, runbooks, decisions, source lineage
generated/      derived OpenAPI / SDK / operation catalog
scripts/        migrate, seed, generate, verify, export, replay
```

## Governing design

The platform preserves three durable sectors from PF-03:

```text
Identity       Research       Continuity
recognizes     learns         materializes
and authorizes                verified transitions
```

Everything else is an interface, projection, contract, execution mechanism, or storage substrate around those sectors.

Read `docs/ARCHITECTURE.md` and `docs/SOURCE_LINEAGE.md` before changing the platform model.
