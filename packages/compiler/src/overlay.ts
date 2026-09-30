export interface OperationOverlay {
  group?: string;
  method?: string;
  description?: string;
  hidden?: boolean;
}
export interface PowerfarmOverlay { operations?: Record<string, OperationOverlay> }

export function applyOverlay(openapi: any, overlay: PowerfarmOverlay): any {
  const clone = structuredClone(openapi);
  const byId = new Map<string, any>();
  for (const pathItem of Object.values<any>(clone.paths ?? {})) {
    for (const operation of Object.values<any>(pathItem ?? {})) if (operation?.operationId) byId.set(operation.operationId, operation);
  }
  for (const [operationId, patch] of Object.entries(overlay.operations ?? {})) {
    const operation = byId.get(operationId);
    if (!operation) continue;
    operation["x-powerfarm-group"] = patch.group ?? operation.tags?.[0] ?? "default";
    operation["x-powerfarm-method"] = patch.method ?? operationId.split(".").at(-1);
    if (patch.description) operation.description = patch.description;
    if (patch.hidden !== undefined) operation["x-powerfarm-hidden"] = patch.hidden;
  }
  return clone;
}
