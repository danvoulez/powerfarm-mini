import type { Database } from "../../db/src/database.ts";
import { newId } from "../../core/src/ids.ts";
import { nowIso } from "../../core/src/time.ts";
import { enumValue, optionalString, requiredString } from "../../core/src/validate.ts";
import { NotFoundError } from "../../core/src/errors.ts";
import { recordAct } from "../../institution/src/acts.ts";

const productClasses = ["public", "general_paid", "individual_paid", "internal"] as const;
const visibility = ["public", "paid", "private", "internal"] as const;

export class ProductService {
  readonly db: Database;
  constructor(db: Database) { this.db = db; }

  listCandidates() { return this.db.all<any>("SELECT * FROM product_candidates ORDER BY created_at DESC LIMIT 200"); }
  listProducts() { return this.db.all<any>("SELECT * FROM products ORDER BY created_at DESC LIMIT 200"); }

  createCandidate(input: Record<string, unknown>, actorId: string) {
    const id = newId("pcan");
    const name = requiredString(input, "name", 500);
    const problem = requiredString(input, "problem", 12000);
    const productClass = enumValue(input, "productClass", productClasses, "internal");
    const recurringDecision = optionalString(input, "recurringDecision", 12000);
    const differentiatedValue = optionalString(input, "differentiatedValue", 12000);
    const maintenanceCase = optionalString(input, "maintenanceCase", 12000);
    const demandEvidence = optionalString(input, "demandEvidence", 12000);
    const externalAlternatives = optionalString(input, "externalAlternatives", 12000);
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run(`INSERT INTO product_candidates(id,name,problem,product_class,recurring_decision,differentiated_value,maintenance_case,demand_evidence,external_alternatives,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'candidate',?,?)`, id, name, problem, productClass, recurringDecision, differentiatedValue, maintenanceCase, demandEvidence, externalAlternatives, now, now);
      recordAct(this.db, { actorId, kind: "product_candidate.recorded", objectType: "product_candidate", objectId: id, payload: { id, name, problem, productClass, recurringDecision, differentiatedValue, maintenanceCase, demandEvidence, externalAlternatives } });
    });
    return this.db.get<any>("SELECT * FROM product_candidates WHERE id=?", id);
  }

  promote(candidateId: string, input: Record<string, unknown>, actorId: string) {
    const candidate = this.db.get<any>("SELECT * FROM product_candidates WHERE id=?", candidateId);
    if (!candidate) throw new NotFoundError("product candidate", candidateId);
    const id = newId("prd");
    const valueProposition = requiredString(input, "valueProposition", 12000);
    const maintenanceTrigger = optionalString(input, "maintenanceTrigger", 12000);
    const productVisibility = enumValue(input, "visibility", visibility, candidate.product_class === "public" ? "public" : "internal");
    const now = nowIso();
    this.db.transaction(() => {
      this.db.run("INSERT INTO products(id,candidate_id,name,product_class,status,value_proposition,maintenance_trigger,visibility,created_at,updated_at) VALUES(?,?,?,?,'active',?,?,?,?,?)", id, candidateId, candidate.name, candidate.product_class, valueProposition, maintenanceTrigger, productVisibility, now, now);
      this.db.run("UPDATE product_candidates SET status='promoted', updated_at=? WHERE id=?", now, candidateId);
      recordAct(this.db, { actorId, kind: "product.promoted", objectType: "product", objectId: id, payload: { id, candidateId, name: candidate.name, productClass: candidate.product_class, valueProposition, maintenanceTrigger, visibility: productVisibility } });
    });
    return this.db.get<any>("SELECT * FROM products WHERE id=?", id);
  }

  listPublications() { return this.db.all<any>("SELECT * FROM publication_records ORDER BY created_at DESC LIMIT 200"); }

  createPublication(input: Record<string, unknown>, actorId: string) {
    const id = newId("pub");
    const productId = optionalString(input, "productId", 256);
    const claimId = optionalString(input, "claimId", 256);
    const title = requiredString(input, "title", 1000);
    const publicationVisibility = enumValue(input, "visibility", visibility, "internal");
    const contentDigest = optionalString(input, "contentDigest", 128);
    const supersedesId = optionalString(input, "supersedesId", 256);
    const now = nowIso();
    if (productId && !this.db.get("SELECT id FROM products WHERE id=?", productId)) throw new NotFoundError("product", productId);
    if (claimId && !this.db.get("SELECT id FROM claims WHERE id=?", claimId)) throw new NotFoundError("claim", claimId);
    return this.db.transaction(() => {
      if (supersedesId) this.db.run("UPDATE publication_records SET corrected_at=? WHERE id=?", now, supersedesId);
      this.db.run("INSERT INTO publication_records(id,product_id,claim_id,title,visibility,content_digest,published_at,supersedes_id,created_at) VALUES(?,?,?,?,?,?,?, ?,?)", id, productId, claimId, title, publicationVisibility, contentDigest, now, supersedesId, now);
      recordAct(this.db, { actorId, kind: "publication.recorded", objectType: "publication", objectId: id, payload: { id, productId, claimId, title, visibility: publicationVisibility, contentDigest, supersedesId, publishedAt: now }, evidenceDigest: contentDigest });
      return this.db.get<any>("SELECT * FROM publication_records WHERE id=?", id);
    });
  }

}
