import { Database } from "../../../packages/db/src/database.ts";
import type { RuntimeConfig } from "../../../packages/db/src/config.ts";
import { bootstrapInstitution } from "../../../packages/institution/src/bootstrap.ts";
import { InstitutionService } from "../../../packages/institution/src/service.ts";
import { AuthService } from "../../../packages/auth/src/service.ts";
import { ContentStore } from "../../../packages/evidence/src/store.ts";
import { ResearchService } from "../../../packages/research/src/service.ts";
import { ContinuityService } from "../../../packages/continuity/src/service.ts";
import { ProductService } from "../../../packages/products/src/service.ts";
import { SearchService } from "../../../packages/search/src/service.ts";
import { CanonService } from "../../../packages/canon/src/service.ts";
import { BenchmarkService } from "../../../packages/benchmarks/src/service.ts";
import { EvidenceSignalService } from "../../../packages/continuity/src/evidence.ts";
import { join } from "node:path";

export function createServices(config: RuntimeConfig) {
  const db = new Database(config.dbPath);
  bootstrapInstitution(db);
  const auth = new AuthService(db, config.adminToken);
  const content = new ContentStore(db, config.objectDir);
  const institution = new InstitutionService(db);
  const research = new ResearchService(db);
  const continuity = new ContinuityService(db, content);
  const products = new ProductService(db);
  const search = new SearchService(db);
  const canon = new CanonService(join(config.rootDir, "canon"));
  const benchmarks = new BenchmarkService(db);
  const signals = new EvidenceSignalService(db);
  return { db, auth, content, institution, research, continuity, products, search, canon, benchmarks, signals, config };
}

export type Services = ReturnType<typeof createServices>;
