export function toJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function fromJson<T = unknown>(value: unknown, fallback: T | null = null): T | null {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function parseJsonObject(value: unknown, name: string): Record<string, unknown> {
  if (value === undefined || value === null) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  throw new TypeError(`${name} must be a JSON object`);
}
