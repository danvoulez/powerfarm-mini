import type { Database } from "../../db/src/database.ts";
import { nowIso } from "../../core/src/time.ts";
import { recordAct } from "./acts.ts";

const bootstrapEntities = [
  ["powerfarm.app/sector/identity", "sector", "Identity"],
  ["powerfarm.app/sector/research", "sector", "Research"],
  ["powerfarm.app/sector/continuity", "sector", "Continuity"],
  ["powerfarm.app/system/platform", "system", "Powerfarm Platform"],
  ["powerfarm.app/principal/local-admin", "principal", "Local Administrator"],
] as const;

export function bootstrapInstitution(db: Database): void {
  const existing = db.get<{ value: string }>("SELECT value FROM meta WHERE key='institution_bootstrapped'");
  if (existing?.value === "1") return;

  db.transaction(() => {
    const now = nowIso();
    for (const [id, kind, name] of bootstrapEntities) {
      db.run(
        `INSERT OR IGNORE INTO entities(id, kind, name, status, metadata_json, created_at, updated_at)
         VALUES(?,?,?,'active','{}',?,?)`, id, kind, name, now, now,
      );
      recordAct(db, {
        actorId: "powerfarm.app/principal/local-admin",
        kind: "entity.recognized",
        objectType: "entity",
        objectId: id,
        payload: { id, kind, name, bootstrap: true },
      });
    }
    db.run("INSERT OR REPLACE INTO meta(key,value) VALUES('institution_bootstrapped','1')");
  });
}
