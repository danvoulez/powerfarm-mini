import type { RouteDefinition } from "./router.ts";

function openApiPath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

export function createOpenApi(routes: RouteDefinition[], publicUrl: string) {
  const paths: Record<string, any> = {};
  for (const route of routes) {
    if (!route.path.startsWith("/api/")) continue;
    const path = openApiPath(route.path);
    paths[path] ??= {};
    const parameters = [...route.path.matchAll(/:([A-Za-z0-9_]+)/g)].map((m) => ({
      name: m[1], in: "path", required: true, schema: { type: "string" },
    }));
    paths[path][route.method.toLowerCase()] = {
      operationId: route.operationId,
      summary: route.summary,
      tags: [route.tag],
      parameters,
      security: route.public ? [] : [{ bearerAuth: [] }],
      "x-powerfarm-capability": route.capability ?? null,
      ...(route.bodyMode === "raw" ? {
        requestBody: { required: true, content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } },
      } : route.bodyMode === "none" || route.method === "GET" ? {} : {
        requestBody: { required: false, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
      }),
      responses: {
        "200": { description: "Success", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
        "201": { description: "Created" },
        "4XX": { description: "Client error" },
        "5XX": { description: "Server error" },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "Powerfarm Platform API",
      version: "0.1.0",
      description: "Contract surface for Powerfarm Identity, Research, Continuity, Evidence, and institutional operations.",
    },
    servers: [{ url: publicUrl }],
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "Powerfarm token" } },
    },
  };
}
