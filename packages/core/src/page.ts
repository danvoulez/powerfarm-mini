export interface PageInput { limit?: number; offset?: number }

export function normalizePage(input: PageInput): { limit: number; offset: number } {
  const limit = Math.max(1, Math.min(200, Number(input.limit ?? 50) || 50));
  const offset = Math.max(0, Number(input.offset ?? 0) || 0);
  return { limit, offset };
}
