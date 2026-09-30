# Source Lineage: Canon, EmDash, and Forge

This repository was built from three evidence groups supplied together: the five Powerfarm canonical documents, the EmDash repository snapshot, and the Forge repository snapshot.

## Authority order

1. **PF-01 through PF-05 govern Powerfarm semantics.**
2. EmDash and Forge are implementation references, not institutional authority.
3. The new platform is greenfield code. It does not vendor either repository wholesale.

## What was learned from EmDash

The EmDash snapshot demonstrates useful implementation breadth:

- a monorepo can keep admin, auth, core, cloud/runtime adapters, plugin tooling, registry clients, tests and documentation separately owned;
- capability access is more inspectable when expressed as a vocabulary and a structured access contract rather than implicit plugin privilege;
- a client transport can be composed through interceptors rather than duplicating auth/retry behavior throughout calls;
- a substantial application API can be generated/documented as OpenAPI;
- human and machine interfaces can live around the same application domain.

Particularly relevant source areas in the supplied snapshot were:

- `packages/plugin-types/src/index.ts`
- `packages/core/src/client/transport.ts`
- `packages/core/src/api/openapi/`
- `packages/admin/`
- workspace package boundaries under `packages/`

Powerfarm reused the **patterns**, not EmDash's CMS domain model. Content collections, CMS plugin semantics, and EmDash-specific authentication/state are not Powerfarm institutional primitives.

## What was learned from Forge

Forge demonstrates a clean derived-surface pipeline:

```text
OpenAPI -> overlays -> semantic model -> transformer -> emitted files
```

Relevant supplied source areas were:

- `packages/forge/init.ts`
- `packages/forge/init-from-openapi.ts`
- `packages/forge/forge.ts`
- overlay resolution/types
- generated SDK transformer packages

Powerfarm adopted the useful separation between base API truth and presentation/generation metadata. The local compiler uses a base OpenAPI document plus a Powerfarm overlay, buffers generated `SourceFile`s, rejects output path traversal, and writes generated artifacts.

Forge-specific `x-fern-*` and `x-forge-*` metadata is not part of the Powerfarm institutional contract.

## Why neither repository became the base

Both repositories solve different product problems and carry their own domain assumptions. The Powerfarm canon requires first-class research epistemic objects, recognized institutional acts, content identity separate from authority, and the Research/Identity/Continuity sector model. Treating either existing repository as Powerfarm's ontology would invert that relationship.

The current platform therefore uses their proven implementation ideas while retaining a Powerfarm-native domain.
