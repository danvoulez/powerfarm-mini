# ADR-0002: SQLite as current operational substrate

**Status:** accepted for v0

Use Node's SQLite binding for local operational state. Keep storage behind `packages/db` and do not encode SQLite as institutional identity.

Reason: the current need is a large usable platform that starts immediately, is portable, transactional, inspectable and requires no infrastructure ceremony. Replace it when measured concurrency, durability, operational, or deployment constraints justify another engine.
