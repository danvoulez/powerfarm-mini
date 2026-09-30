import type { Database } from "../../db/src/database.ts";
import { newId } from "../../core/src/ids.ts";
import { nowIso } from "../../core/src/time.ts";
import { fromJson, toJson } from "../../core/src/json.ts";

export interface RecordActInput {
  actorId: string;
  kind: string;
  objectType: string;
  objectId: string;
  payload?: unknown;
  evidenceDigest?: string | null;
}

export function recordAct(db: Database, input: RecordActInput): string {
  const id = newId("act");
  db.run(
    `INSERT INTO recorded_acts(id, actor_id, kind, object_type, object_id, payload_json, evidence_digest, created_at)
     VALUES(?,?,?,?,?,?,?,?)`,
    id, input.actorId, input.kind, input.objectType, input.objectId,
    toJson(input.payload ?? {}), input.evidenceDigest ?? null, nowIso(),
  );
  return id;
}

export function listActs(db: Database, limit = 100, offset = 0) {
  return db.all<any>(`SELECT * FROM recorded_acts ORDER BY seq DESC LIMIT ? OFFSET ?`, limit, offset)
    .map((row) => ({ ...row, payload: fromJson(row.payload_json, {}), payload_json: undefined }));
}
