# ADR-0004: Derive API surfaces from one route contract

**Status:** accepted

HTTP operation identity and capability requirements live once in the route registry. OpenAPI and SDK surfaces are generated from that registry, with generation-only metadata supplied through an overlay.

This adopts the strongest pattern observed in the supplied Forge source while keeping generator-specific metadata outside institutional semantics.
