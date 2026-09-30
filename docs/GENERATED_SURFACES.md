# Generated Surfaces

Powerfarm keeps API semantics above client boilerplate.

The server route registry is the source for operation identity, capability requirement, summary, tag, path and HTTP method. `scripts/generate.ts` derives an OpenAPI 3.1 document, applies `contracts/overlays/powerfarm.json`, and emits developer-facing surfaces.

The overlay is deliberately separate from the server contract. A generator can change without editing the API implementation, and the server does not need Forge/Fern-specific annotations.

Generated artifacts:

- `openapi.json`: complete API contract.
- `operations.json`: normalized operation catalog.
- `capabilities.json`: explicit capability vocabulary.
- `sdk.mjs`: zero-dependency generated JavaScript client.

This pattern was informed by the supplied Forge repository but is Powerfarm-owned implementation code.
