import { ValidationError } from "./errors.ts";

export function requiredString(input: Record<string, unknown>, key: string, max = 4096): string {
  const value = input[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${key} is required`);
  }
  if (value.length > max) throw new ValidationError(`${key} exceeds ${max} characters`);
  return value.trim();
}

export function optionalString(input: Record<string, unknown>, key: string, max = 4096): string | null {
  const value = input[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ValidationError(`${key} must be a string`);
  if (value.length > max) throw new ValidationError(`${key} exceeds ${max} characters`);
  return value.trim();
}

export function enumValue<T extends string>(input: Record<string, unknown>, key: string, allowed: readonly T[], fallback?: T): T {
  const value = input[key];
  if ((value === undefined || value === null || value === "") && fallback !== undefined) return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ValidationError(`${key} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

export function booleanValue(input: Record<string, unknown>, key: string, fallback = false): boolean {
  const value = input[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") throw new ValidationError(`${key} must be boolean`);
  return value;
}

export function jsonObject(input: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = input[key];
  if (value === undefined || value === null) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ValidationError(`${key} must be an object`);
  return value as Record<string, unknown>;
}

export function numberValue(input: Record<string, unknown>, key: string, fallback?: number): number {
  const value = input[key];
  if ((value === undefined || value === null) && fallback !== undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new ValidationError(`${key} must be a finite number`);
  return value;
}
