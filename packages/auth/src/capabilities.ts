export const capabilities = [
  "institution:read", "institution:write",
  "registry:read", "registry:write",
  "contracts:read", "contracts:write",
  "grants:read", "grants:write",
  "research:read", "research:write",
  "evidence:read", "evidence:write",
  "continuity:read", "continuity:write", "continuity:execute",
  "products:read", "products:write",
  "decisions:read", "decisions:write",
  "incidents:read", "incidents:write",
  "search:read", "acts:read",
  "tokens:write", "system:admin",
] as const;

export type Capability = typeof capabilities[number] | "*";

export function capabilityMatches(granted: string, required: string): boolean {
  if (granted === "*" || granted === required) return true;
  if (granted.endsWith(":*") && required.startsWith(granted.slice(0, -1))) return true;
  return false;
}
