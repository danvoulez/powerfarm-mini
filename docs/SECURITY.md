# Security Model

## Current boundary

Powerfarm Platform v0 is designed first for controlled/internal deployment. The core security invariants are nevertheless explicit:

- bearer credentials are stored only as SHA-256 hashes;
- principals are institutional entities;
- authorization is capability-based and separate from authentication;
- grants may allow or deny narrow capability strings;
- immutable content identity does not grant read authority by itself;
- browser pages use same-origin requests and restrictive security headers;
- Continuity does not provide arbitrary network effects by default;
- Continuity `record.act` effects are confined to the `continuity.effect.*` act namespace, which replay does not interpret, so executable contracts cannot forge recognized mutations;
- malformed request URLs are rejected with `400` and cannot terminate the server process;
- generated file output rejects path traversal;
- object paths are derived only from validated SHA-256 digests.

## Bootstrap administrator

`POWERFARM_ADMIN_TOKEN` is a bootstrap operational exception. The default value is suitable only for local development: the server refuses to start with it on any non-loopback `POWERFARM_HOST`, and it prints the token only when it is the public default. Shared deployment must override it and should issue narrower database-backed tokens for routine integrations.

## Not yet claimed

This repository does not claim hardened multi-tenant isolation, hostile plugin sandboxing, externally audited cryptography, or internet-facing production readiness. Those claims require deployment-specific threat modeling and evidence.
