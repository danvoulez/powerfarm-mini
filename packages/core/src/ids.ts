import { randomUUID } from "node:crypto";

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

export function assertId(value: unknown, name = "id"): string {
  if (typeof value !== "string" || value.length < 3 || value.length > 256) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}
