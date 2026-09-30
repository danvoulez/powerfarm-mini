export function nowIso(): string {
  return new Date().toISOString();
}

export function parseIso(value: unknown, name: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${name} must be an ISO-8601 timestamp`);
  }
  return new Date(value).toISOString();
}
