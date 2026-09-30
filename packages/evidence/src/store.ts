import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Database } from "../../db/src/database.ts";
import { sha256 } from "../../core/src/hash.ts";
import { nowIso } from "../../core/src/time.ts";
import { toJson, fromJson } from "../../core/src/json.ts";
import { NotFoundError, ConflictError } from "../../core/src/errors.ts";
import { recordAct } from "../../institution/src/acts.ts";

export interface ContentObject {
  digest: string;
  algorithm: string;
  size_bytes: number;
  media_type: string;
  object_kind: string;
  manifest?: unknown;
  created_by: string;
  created_at: string;
  verified_at?: string | null;
}

export class ContentStore {
  readonly root: string;
  readonly db: Database;
  constructor(db: Database, root: string) {
    this.db = db;
    this.root = resolve(root);
    mkdirSync(this.root, { recursive: true });
  }

  pathFor(digest: string): string {
    if (!/^[a-f0-9]{64}$/.test(digest)) throw new TypeError("digest must be a SHA-256 hex string");
    return join(this.root, "sha256", digest.slice(0, 2), digest.slice(2));
  }

  putBytes(bytes: Uint8Array, mediaType: string, actorId: string, kind = "blob", manifest?: unknown): ContentObject {
    const digest = sha256(bytes);
    const path = this.pathFor(digest);
    mkdirSync(join(this.root, "sha256", digest.slice(0, 2)), { recursive: true });
    if (!existsSync(path)) writeFileSync(path, bytes, { flag: "wx" });
    const size = statSync(path).size;
    if (size !== bytes.byteLength) throw new ConflictError(`Digest collision or corrupted existing object: ${digest}`);
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run(
        `INSERT OR IGNORE INTO content_objects(digest,algorithm,size_bytes,media_type,object_kind,manifest_json,created_by,created_at,verified_at)
         VALUES(?,'sha256',?,?,?,?,?,?,?)`,
        digest, bytes.byteLength, mediaType || "application/octet-stream", kind, manifest ? toJson(manifest) : null, actorId, now, now,
      );
      recordAct(this.db, { actorId, kind: "content.preserved", objectType: "content_object", objectId: digest, payload: { digest, sizeBytes: bytes.byteLength, mediaType, objectKind: kind, manifest: manifest ?? null }, evidenceDigest: digest });
    });
    return this.getMetadata(digest);
  }

  putJson(value: unknown, actorId: string, kind = "manifest"): ContentObject {
    const bytes = new TextEncoder().encode(JSON.stringify(value, null, 2) + "\n");
    return this.putBytes(bytes, "application/json", actorId, kind, value);
  }

  getMetadata(digest: string): ContentObject {
    const row = this.db.get<any>("SELECT * FROM content_objects WHERE digest=?", digest);
    if (!row) throw new NotFoundError("content object", digest);
    return { ...row, manifest: fromJson(row.manifest_json), manifest_json: undefined };
  }

  getBytes(digest: string, verify = true): Uint8Array {
    const metadata = this.getMetadata(digest);
    const path = this.pathFor(digest);
    if (!existsSync(path)) throw new NotFoundError("content bytes", digest);
    const bytes = readFileSync(path);
    if (verify && sha256(bytes) !== digest) throw new ConflictError(`Content verification failed for ${digest}`);
    if (verify) this.db.run("UPDATE content_objects SET verified_at=? WHERE digest=?", nowIso(), digest);
    if (bytes.byteLength !== Number(metadata.size_bytes)) throw new ConflictError(`Content size mismatch for ${digest}`);
    return bytes;
  }

  verify(digest: string): { digest: string; valid: boolean; sizeBytes: number } {
    const bytes = this.getBytes(digest, false);
    const valid = sha256(bytes) === digest;
    if (valid) this.db.run("UPDATE content_objects SET verified_at=? WHERE digest=?", nowIso(), digest);
    return { digest, valid, sizeBytes: bytes.byteLength };
  }

  list(limit = 100, offset = 0): ContentObject[] {
    return this.db.all<any>("SELECT * FROM content_objects ORDER BY created_at DESC LIMIT ? OFFSET ?", limit, offset)
      .map((row) => ({ ...row, manifest: fromJson(row.manifest_json), manifest_json: undefined }));
  }
}
