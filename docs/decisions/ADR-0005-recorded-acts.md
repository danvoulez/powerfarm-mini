# ADR-0005: Material institutional mutations carry recorded acts

**Status:** accepted

Recognized state mutations and their institutional acts are written transactionally. Export carries the ordered act stream plus preserved immutable content. Replay reconstructs the current supported recognized state vocabulary into a fresh database.
