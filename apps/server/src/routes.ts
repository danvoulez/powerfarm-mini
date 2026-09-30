import { Router } from "../../../packages/api/src/router.ts";
import { createOpenApi } from "../../../packages/api/src/openapi.ts";
import { capabilities } from "../../../packages/auth/src/capabilities.ts";
import { listActs } from "../../../packages/institution/src/acts.ts";
import type { Services } from "./services.ts";

function actor(ctx: any): string {
  return ctx.principal?.entityId ?? "anonymous";
}

function num(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function buildRouter(services: Services): Router {
  const r = new Router(services.auth);

  r.route({ method: "GET", path: "/api/v1/health", operationId: "system.health", summary: "Health and platform identity", tag: "System", public: true, bodyMode: "none", handler: () => ({
    status: 200,
    body: { data: { status: "ok", service: "powerfarm-platform", version: "0.1.0", schemaVersion: services.db.get<any>("SELECT value FROM meta WHERE key='schema_version'")?.value ?? null } },
  }) });

  r.route({ method: "GET", path: "/api/v1/dashboard", operationId: "system.dashboard", summary: "Institution dashboard counters", tag: "System", capability: "institution:read", bodyMode: "none", handler: () => {
    const count = (table: string) => Number(services.db.get<any>(`SELECT COUNT(*) AS n FROM ${table}`)?.n ?? 0);
    const activeExecutions = Number(services.db.get<any>("SELECT COUNT(*) AS n FROM executions WHERE state IN ('ready','claimed','executing','uncertain')")?.n ?? 0);
    const openIncidents = Number(services.db.get<any>("SELECT COUNT(*) AS n FROM incidents WHERE status='open'")?.n ?? 0);
    return { data: {
      entities: count("entities"), artifacts: count("artifacts"), studies: count("studies"), runs: count("runs"), claims: count("claims"),
      contentObjects: count("content_objects"), recordedActs: count("recorded_acts"), products: count("products"), activeExecutions, openIncidents,
      recentActs: listActs(services.db, 8, 0),
      recentStudies: services.research.listStudies({ limit: 5 }),
      recentClaims: services.research.listClaims({ limit: 5 }),
    } };
  } });

  r.route({ method: "GET", path: "/api/v1/system/manifest", operationId: "system.manifest", summary: "Platform implementation manifest", tag: "System", capability: "institution:read", bodyMode: "none", handler: () => ({ data: {
    name: "Powerfarm Platform", version: "0.1.0",
    sectors: ["Identity", "Research", "Continuity"],
    capabilities,
    invariants: [
      "State is local; contracts are global.",
      "Preserved bytes are content-addressed.",
      "Material mutations produce recorded acts.",
      "Observations, measurements, findings, claims, confidence, conclusions, and recommendations remain distinct.",
      "Execution separates trigger, atomic claim, materialization, receipt, and verification.",
    ],
  } }) });

  r.route({ method: "GET", path: "/api/v1/canon", operationId: "canon.list", summary: "List canonical Powerfarm documents", tag: "Canon", capability: "institution:read", bodyMode: "none", handler: () => ({ data: services.canon.list() }) });
  r.route({ method: "GET", path: "/api/v1/canon/:id", operationId: "canon.get", summary: "Read one canonical Powerfarm document", tag: "Canon", capability: "institution:read", bodyMode: "none", handler: ({ params }) => {
    const doc = services.canon.get(params.id);
    return doc ? { data: doc } : { status: 404, body: { error: { code: "not_found", message: `Canon document not found: ${params.id}` } } };
  } });

  r.route({ method: "POST", path: "/api/v1/auth/tokens", operationId: "auth.tokens.issue", summary: "Issue an API token", tag: "Auth", capability: "tokens:write", handler: (ctx) => ({ status: 201, body: { data: services.auth.issue(String(ctx.body.principalEntityId ?? ""), String(ctx.body.label ?? "API token"), actor(ctx)) } }) });

  r.route({ method: "GET", path: "/api/v1/entities", operationId: "identity.entities.list", summary: "List recognized entities", tag: "Identity", capability: "registry:read", bodyMode: "none", handler: ({ query }) => ({ data: services.institution.listEntities({ kind: query.get("kind") ?? undefined, status: query.get("status") ?? undefined, limit: num(query.get("limit"), 50), offset: num(query.get("offset"), 0) }) }) });
  r.route({ method: "POST", path: "/api/v1/entities", operationId: "identity.entities.create", summary: "Recognize an entity", tag: "Identity", capability: "registry:write", handler: (ctx) => ({ status: 201, body: { data: services.institution.createEntity(ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/entities/:id", operationId: "identity.entities.get", summary: "Get a recognized entity", tag: "Identity", capability: "registry:read", bodyMode: "none", handler: ({ params }) => ({ data: services.institution.getEntity(params.id) }) });

  r.route({ method: "GET", path: "/api/v1/artifacts", operationId: "registry.artifacts.list", summary: "List institutional artifacts", tag: "Registry", capability: "registry:read", bodyMode: "none", handler: ({ query }) => ({ data: services.institution.listArtifacts({ kind: query.get("kind") ?? undefined, limit: num(query.get("limit"), 50), offset: num(query.get("offset"), 0) }) }) });
  r.route({ method: "POST", path: "/api/v1/artifacts", operationId: "registry.artifacts.create", summary: "Recognize an artifact", tag: "Registry", capability: "registry:write", handler: (ctx) => ({ status: 201, body: { data: services.institution.createArtifact(ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/artifacts/:id", operationId: "registry.artifacts.get", summary: "Get an artifact and versions", tag: "Registry", capability: "registry:read", bodyMode: "none", handler: ({ params }) => ({ data: services.institution.getArtifact(params.id) }) });
  r.route({ method: "POST", path: "/api/v1/artifacts/:id/versions", operationId: "registry.artifacts.versions.create", summary: "Recognize an artifact version", tag: "Registry", capability: "registry:write", handler: (ctx) => ({ status: 201, body: { data: services.institution.addArtifactVersion(ctx.params.id, ctx.body, actor(ctx)) } }) });

  r.route({ method: "GET", path: "/api/v1/contracts", operationId: "identity.contracts.list", summary: "List institutional contracts", tag: "Identity", capability: "contracts:read", bodyMode: "none", handler: ({ query }) => ({ data: services.institution.listContracts(num(query.get("limit"), 100), num(query.get("offset"), 0)) }) });
  r.route({ method: "POST", path: "/api/v1/contracts", operationId: "identity.contracts.create", summary: "Recognize an institutional contract", tag: "Identity", capability: "contracts:write", handler: (ctx) => ({ status: 201, body: { data: services.institution.createContract(ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/grants", operationId: "identity.grants.list", summary: "List authority grants", tag: "Identity", capability: "grants:read", bodyMode: "none", handler: ({ query }) => ({ data: services.institution.listGrants(query.get("subjectEntityId") ?? undefined) }) });
  r.route({ method: "POST", path: "/api/v1/grants", operationId: "identity.grants.create", summary: "Issue an authority grant", tag: "Identity", capability: "grants:write", handler: (ctx) => ({ status: 201, body: { data: services.institution.createGrant(ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/app-contracts", operationId: "identity.appContracts.list", summary: "List App Contracts", tag: "Identity", capability: "contracts:read", bodyMode: "none", handler: () => ({ data: services.institution.listAppContracts() }) });
  r.route({ method: "POST", path: "/api/v1/app-contracts", operationId: "identity.appContracts.create", summary: "Recognize an App Contract", tag: "Identity", capability: "contracts:write", handler: (ctx) => ({ status: 201, body: { data: services.institution.createAppContract(ctx.body, actor(ctx)) } }) });

  r.route({ method: "GET", path: "/api/v1/acts", operationId: "institution.acts.list", summary: "List recorded institutional acts", tag: "Institution", capability: "acts:read", bodyMode: "none", handler: ({ query }) => ({ data: listActs(services.db, num(query.get("limit"), 100), num(query.get("offset"), 0)) }) });
  r.route({ method: "GET", path: "/api/v1/decisions", operationId: "institution.decisions.list", summary: "List decision records", tag: "Institution", capability: "decisions:read", bodyMode: "none", handler: () => ({ data: services.institution.listDecisions() }) });
  r.route({ method: "POST", path: "/api/v1/decisions", operationId: "institution.decisions.create", summary: "Record a consequential decision", tag: "Institution", capability: "decisions:write", handler: (ctx) => ({ status: 201, body: { data: services.institution.createDecision(ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/incidents", operationId: "institution.incidents.list", summary: "List learning incidents", tag: "Institution", capability: "incidents:read", bodyMode: "none", handler: () => ({ data: services.institution.listIncidents() }) });
  r.route({ method: "POST", path: "/api/v1/incidents", operationId: "institution.incidents.create", summary: "Open a learning incident", tag: "Institution", capability: "incidents:write", handler: (ctx) => ({ status: 201, body: { data: services.institution.createIncident(ctx.body, actor(ctx)) } }) });

  r.route({ method: "GET", path: "/api/v1/studies", operationId: "research.studies.list", summary: "List research studies", tag: "Research", capability: "research:read", bodyMode: "none", handler: ({ query }) => ({ data: services.research.listStudies({ status: query.get("status") ?? undefined, studyClass: query.get("studyClass") ?? undefined, limit: num(query.get("limit"), 50), offset: num(query.get("offset"), 0) }) }) });
  r.route({ method: "POST", path: "/api/v1/studies", operationId: "research.studies.create", summary: "Create a decision-first research study", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.research.createStudy(ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/studies/:id", operationId: "research.studies.get", summary: "Get a research study and its current evidence structure", tag: "Research", capability: "research:read", bodyMode: "none", handler: ({ params }) => ({ data: services.research.getStudy(params.id) }) });
  r.route({ method: "POST", path: "/api/v1/studies/:id/status", operationId: "research.studies.status", summary: "Change study lifecycle state", tag: "Research", capability: "research:write", handler: (ctx) => ({ data: services.research.updateStudyStatus(ctx.params.id, String(ctx.body.status ?? ""), actor(ctx)) }) });
  r.route({ method: "POST", path: "/api/v1/studies/:id/comparators", operationId: "research.comparators.create", summary: "Add a credible comparator", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.research.addComparator(ctx.params.id, ctx.body, actor(ctx)) } }) });
  r.route({ method: "POST", path: "/api/v1/studies/:id/runs", operationId: "research.runs.create", summary: "Start a material research run", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.research.createRun(ctx.params.id, ctx.body, actor(ctx)) } }) });
  r.route({ method: "POST", path: "/api/v1/studies/:id/findings", operationId: "research.findings.create", summary: "Record a finding supported by analyzed measurements", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.research.addFinding(ctx.params.id, ctx.body, actor(ctx)) } }) });
  r.route({ method: "POST", path: "/api/v1/studies/:id/conclusions", operationId: "research.conclusions.create", summary: "Record a study conclusion", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.research.createConclusion(ctx.params.id, ctx.body, actor(ctx)) } }) });

  r.route({ method: "GET", path: "/api/v1/runs/:id", operationId: "research.runs.get", summary: "Get a run with observations and measurements", tag: "Research", capability: "research:read", bodyMode: "none", handler: ({ params }) => ({ data: services.research.getRun(params.id) }) });
  r.route({ method: "POST", path: "/api/v1/runs/:id/complete", operationId: "research.runs.complete", summary: "Complete a run with explicit result state", tag: "Research", capability: "research:write", handler: (ctx) => ({ data: services.research.completeRun(ctx.params.id, ctx.body, actor(ctx)) }) });
  r.route({ method: "POST", path: "/api/v1/runs/:id/observations", operationId: "research.observations.create", summary: "Preserve an observation", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.research.addObservation(ctx.params.id, ctx.body, actor(ctx)) } }) });
  r.route({ method: "POST", path: "/api/v1/runs/:id/measurements", operationId: "research.measurements.create", summary: "Record a structured measurement", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.research.addMeasurement(ctx.params.id, ctx.body, actor(ctx)) } }) });

  r.route({ method: "GET", path: "/api/v1/benchmarks", operationId: "research.benchmarks.list", summary: "List versioned benchmark instruments", tag: "Research", capability: "research:read", bodyMode: "none", handler: () => ({ data: services.benchmarks.list() }) });
  r.route({ method: "POST", path: "/api/v1/benchmarks", operationId: "research.benchmarks.create", summary: "Create a versioned benchmark instrument", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.benchmarks.create(ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/benchmarks/:id", operationId: "research.benchmarks.get", summary: "Get benchmark instrument and tasks", tag: "Research", capability: "research:read", bodyMode: "none", handler: ({ params }) => ({ data: services.benchmarks.get(params.id) }) });
  r.route({ method: "POST", path: "/api/v1/benchmarks/:id/tasks", operationId: "research.benchmarkTasks.create", summary: "Add a task to a benchmark instrument", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.benchmarks.addTask(ctx.params.id, ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/test-benches", operationId: "research.testBenches.list", summary: "List full evaluation configurations", tag: "Research", capability: "research:read", bodyMode: "none", handler: ({ query }) => ({ data: services.benchmarks.listTestBenches(query.get("studyId") ?? undefined) }) });
  r.route({ method: "POST", path: "/api/v1/studies/:id/test-benches", operationId: "research.testBenches.create", summary: "Create a test bench for a decision question", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.benchmarks.createTestBench(ctx.params.id, ctx.body, actor(ctx)) } }) });

  r.route({ method: "GET", path: "/api/v1/claims", operationId: "research.claims.list", summary: "List scoped claims", tag: "Research", capability: "research:read", bodyMode: "none", handler: ({ query }) => ({ data: services.research.listClaims({ status: query.get("status") ?? undefined, limit: num(query.get("limit"), 50), offset: num(query.get("offset"), 0) }) }) });
  r.route({ method: "POST", path: "/api/v1/claims", operationId: "research.claims.create", summary: "Record a scoped claim", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.research.createClaim(ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/claims/:id", operationId: "research.claims.get", summary: "Get claim, evidence, and confidence history", tag: "Research", capability: "research:read", bodyMode: "none", handler: ({ params }) => ({ data: services.research.getClaim(params.id) }) });
  r.route({ method: "POST", path: "/api/v1/claims/:id/evidence", operationId: "research.claims.evidence.create", summary: "Link supporting or contradicting evidence", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.research.attachClaimEvidence(ctx.params.id, ctx.body, actor(ctx)) } }) });
  r.route({ method: "POST", path: "/api/v1/claims/:id/confidence", operationId: "research.claims.confidence.create", summary: "Assess claim confidence", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.research.assessConfidence(ctx.params.id, ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/recommendations", operationId: "research.recommendations.list", summary: "List recommendations", tag: "Research", capability: "research:read", bodyMode: "none", handler: () => ({ data: services.research.listRecommendations() }) });
  r.route({ method: "POST", path: "/api/v1/recommendations", operationId: "research.recommendations.create", summary: "Record a recommendation under explicit constraints", tag: "Research", capability: "research:write", handler: (ctx) => ({ status: 201, body: { data: services.research.createRecommendation(ctx.body, actor(ctx)) } }) });

  r.route({ method: "GET", path: "/api/v1/content", operationId: "evidence.content.list", summary: "List immutable content objects", tag: "Evidence", capability: "evidence:read", bodyMode: "none", handler: ({ query }) => ({ data: services.content.list(num(query.get("limit"), 100), num(query.get("offset"), 0)) }) });
  r.route({ method: "POST", path: "/api/v1/content", operationId: "evidence.content.put", summary: "Preserve raw bytes by SHA-256", tag: "Evidence", capability: "evidence:write", bodyMode: "raw", maxBodyBytes: 100 * 1024 * 1024, handler: (ctx) => ({ status: 201, body: { data: services.content.putBytes(ctx.rawBody, String(ctx.request.headers["content-type"] ?? "application/octet-stream"), actor(ctx), String(ctx.request.headers["x-powerfarm-object-kind"] ?? "blob")) } }) });
  r.route({ method: "GET", path: "/api/v1/content/:digest", operationId: "evidence.content.get", summary: "Resolve immutable content by digest", tag: "Evidence", capability: "evidence:read", bodyMode: "none", handler: ({ params }) => {
    const meta = services.content.getMetadata(params.digest);
    return { status: 200, raw: services.content.getBytes(params.digest), headers: { "content-type": meta.media_type, "x-powerfarm-digest": meta.digest } };
  } });
  r.route({ method: "POST", path: "/api/v1/content/:digest/verify", operationId: "evidence.content.verify", summary: "Verify preserved bytes against digest", tag: "Evidence", capability: "evidence:read", bodyMode: "none", handler: ({ params }) => ({ data: services.content.verify(params.digest) }) });

  r.route({ method: "GET", path: "/api/v1/evidence-signals", operationId: "continuity.evidence.list", summary: "List temporal or observational evidence signals", tag: "Continuity", capability: "continuity:read", bodyMode: "none", handler: ({ query }) => ({ data: services.signals.list(query.get("domain") ?? undefined, query.get("subject") ?? undefined) }) });
  r.route({ method: "POST", path: "/api/v1/evidence-signals", operationId: "continuity.evidence.record", summary: "Record temporal or observational evidence", tag: "Continuity", capability: "continuity:write", handler: (ctx) => ({ status: 201, body: { data: services.signals.record(ctx.body, actor(ctx)) } }) });

  r.route({ method: "GET", path: "/api/v1/execution-routes", operationId: "continuity.routes.list", summary: "List intelligence/execution routes", tag: "Continuity", capability: "continuity:read", bodyMode: "none", handler: () => ({ data: services.continuity.listRoutes() }) });
  r.route({ method: "POST", path: "/api/v1/execution-routes", operationId: "continuity.routes.create", summary: "Define an execution route", tag: "Continuity", capability: "continuity:write", handler: (ctx) => ({ status: 201, body: { data: services.continuity.createRoute(ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/executable-contracts", operationId: "continuity.contracts.list", summary: "List executable contracts", tag: "Continuity", capability: "continuity:read", bodyMode: "none", handler: () => ({ data: services.continuity.listContracts() }) });
  r.route({ method: "POST", path: "/api/v1/executable-contracts", operationId: "continuity.contracts.create", summary: "Create an executable contract C=(T,O,pi,E,V)", tag: "Continuity", capability: "continuity:write", handler: (ctx) => ({ status: 201, body: { data: services.continuity.createContract(ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/executable-contracts/:id", operationId: "continuity.contracts.get", summary: "Get executable contract", tag: "Continuity", capability: "continuity:read", bodyMode: "none", handler: ({ params }) => ({ data: services.continuity.getContract(params.id) }) });
  r.route({ method: "POST", path: "/api/v1/executable-contracts/:id/trigger", operationId: "continuity.contracts.trigger", summary: "Create an execution trigger and durable claim candidate", tag: "Continuity", capability: "continuity:execute", handler: (ctx) => ({ status: 201, body: { data: services.continuity.trigger(ctx.params.id, ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/executions", operationId: "continuity.executions.list", summary: "List durable executions", tag: "Continuity", capability: "continuity:read", bodyMode: "none", handler: ({ query }) => ({ data: services.continuity.listExecutions(query.get("state") ?? undefined) }) });
  r.route({ method: "GET", path: "/api/v1/executions/:id", operationId: "continuity.executions.get", summary: "Get execution causal state and receipts", tag: "Continuity", capability: "continuity:read", bodyMode: "none", handler: ({ params }) => ({ data: services.continuity.getExecution(params.id) }) });
  r.route({ method: "POST", path: "/api/v1/executions/run-next", operationId: "continuity.executions.runNext", summary: "Claim and materialize one ready execution", tag: "Continuity", capability: "continuity:execute", bodyMode: "none", handler: (ctx) => ({ data: services.continuity.runNext(actor(ctx)) }) });

  r.route({ method: "GET", path: "/api/v1/product-candidates", operationId: "products.candidates.list", summary: "List productization candidates", tag: "Products", capability: "products:read", bodyMode: "none", handler: () => ({ data: services.products.listCandidates() }) });
  r.route({ method: "POST", path: "/api/v1/product-candidates", operationId: "products.candidates.create", summary: "Record a productization candidate", tag: "Products", capability: "products:write", handler: (ctx) => ({ status: 201, body: { data: services.products.createCandidate(ctx.body, actor(ctx)) } }) });
  r.route({ method: "POST", path: "/api/v1/product-candidates/:id/promote", operationId: "products.candidates.promote", summary: "Promote a candidate through the productization gate", tag: "Products", capability: "products:write", handler: (ctx) => ({ status: 201, body: { data: services.products.promote(ctx.params.id, ctx.body, actor(ctx)) } }) });
  r.route({ method: "GET", path: "/api/v1/products", operationId: "products.list", summary: "List maintained products", tag: "Products", capability: "products:read", bodyMode: "none", handler: () => ({ data: services.products.listProducts() }) });

  r.route({ method: "GET", path: "/api/v1/publications", operationId: "products.publications.list", summary: "List publication/correction history", tag: "Products", capability: "products:read", bodyMode: "none", handler: () => ({ data: services.products.listPublications() }) });
  r.route({ method: "POST", path: "/api/v1/publications", operationId: "products.publications.create", summary: "Record a publication linked to claims/products and immutable content", tag: "Products", capability: "products:write", handler: (ctx) => ({ status: 201, body: { data: services.products.createPublication(ctx.body, actor(ctx)) } }) });

  r.route({ method: "GET", path: "/api/v1/search", operationId: "search.query", summary: "Federated institutional search projection", tag: "Search", capability: "search:read", bodyMode: "none", handler: ({ query }) => ({ data: services.search.search(query.get("q") ?? "", num(query.get("limit"), 50)) }) });

  r.route({ method: "GET", path: "/api/openapi.json", operationId: "system.openapi", summary: "OpenAPI 3.1 contract", tag: "System", public: true, bodyMode: "none", handler: () => ({ data: createOpenApi(r.definitions(), services.config.publicUrl) }) });

  return r;
}
