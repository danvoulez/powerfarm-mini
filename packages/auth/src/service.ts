import type { Database } from "../../db/src/database.ts";
import { ForbiddenError } from "../../core/src/errors.ts";
import { issueToken, sha256 } from "../../core/src/hash.ts";
import { newId } from "../../core/src/ids.ts";
import { nowIso } from "../../core/src/time.ts";
import { capabilityMatches } from "./capabilities.ts";
import { recordAct } from "../../institution/src/acts.ts";

export interface Principal {
  entityId: string;
  tokenId: string | null;
  capabilities: string[];
  isBootstrapAdmin: boolean;
}

export class AuthService {
  readonly db: Database;
  readonly bootstrapToken: string;
  constructor(db: Database, bootstrapToken: string) { this.db = db; this.bootstrapToken = bootstrapToken; }

  authenticate(authorization: string | null | undefined): Principal | null {
    if (!authorization?.startsWith("Bearer ")) return null;
    const token = authorization.slice(7).trim();
    if (!token) return null;
    if (token === this.bootstrapToken) {
      return { entityId: "powerfarm.app/principal/local-admin", tokenId: null, capabilities: ["*"], isBootstrapAdmin: true };
    }
    const hash = sha256(token);
    const row = this.db.get<any>("SELECT * FROM api_tokens WHERE token_hash=? AND revoked_at IS NULL", hash);
    if (!row) return null;
    this.db.run("UPDATE api_tokens SET last_used_at=? WHERE id=?", nowIso(), row.id);
    const grants = this.db.all<any>(`SELECT capability,effect,expires_at FROM grants WHERE subject_entity_id=? AND status='active'`, row.principal_entity_id);
    const now = Date.now();
    const allowed = grants.filter((g) => g.effect === "allow" && (!g.expires_at || Date.parse(g.expires_at) > now)).map((g) => g.capability);
    const denied = grants.filter((g) => g.effect === "deny" && (!g.expires_at || Date.parse(g.expires_at) > now)).map((g) => g.capability);
    const capabilities = allowed.filter((cap) => !denied.some((d) => capabilityMatches(d, cap)));
    return { entityId: row.principal_entity_id, tokenId: row.id, capabilities, isBootstrapAdmin: false };
  }

  require(principal: Principal | null, capability: string): Principal {
    if (!principal) throw new ForbiddenError(capability);
    if (!principal.capabilities.some((granted) => capabilityMatches(granted, capability))) throw new ForbiddenError(capability);
    return principal;
  }

  issue(principalEntityId: string, label: string, actorId: string): { id: string; token: string; principalEntityId: string; label: string } {
    const entity = this.db.get("SELECT id FROM entities WHERE id=?", principalEntityId);
    if (!entity) throw new Error(`Unknown principal entity: ${principalEntityId}`);
    const id = newId("tok");
    const token = issueToken();
    this.db.transaction(() => {
      this.db.run("INSERT INTO api_tokens(id,principal_entity_id,label,token_hash,created_at) VALUES(?,?,?,?,?)", id, principalEntityId, label, sha256(token), nowIso());
      recordAct(this.db, { actorId, kind: "token.issued", objectType: "api_token", objectId: id, payload: { id, principalEntityId, label } });
    });
    return { id, token, principalEntityId, label };
  }
}
