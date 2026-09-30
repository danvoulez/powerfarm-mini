import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export function issueToken(bytes = 32): string {
  return `pf_${randomBytes(bytes).toString("base64url")}`;
}

export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
