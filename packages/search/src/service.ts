import type { Database } from "../../db/src/database.ts";

export class SearchService {
  readonly db: Database;
  constructor(db: Database) { this.db = db; }

  search(query: string, limit = 50) {
    const q = `%${query.trim()}%`;
    if (q === "%%") return [];
    const per = Math.max(1, Math.min(20, Math.ceil(limit / 5)));
    const rows = [
      ...this.db.all<any>("SELECT 'entity' AS type,id,name AS title,kind AS subtitle,created_at FROM entities WHERE name LIKE ? OR id LIKE ? LIMIT ?", q, q, per),
      ...this.db.all<any>("SELECT 'artifact' AS type,id,name AS title,kind AS subtitle,created_at FROM artifacts WHERE name LIKE ? OR description LIKE ? LIMIT ?", q, q, per),
      ...this.db.all<any>("SELECT 'study' AS type,id,title,decision_question AS subtitle,created_at FROM studies WHERE title LIKE ? OR decision_question LIKE ? LIMIT ?", q, q, per),
      ...this.db.all<any>("SELECT 'claim' AS type,id,statement AS title,scope AS subtitle,created_at FROM claims WHERE statement LIKE ? OR scope LIKE ? LIMIT ?", q, q, per),
      ...this.db.all<any>("SELECT 'product' AS type,id,name AS title,value_proposition AS subtitle,created_at FROM products WHERE name LIKE ? OR value_proposition LIKE ? LIMIT ?", q, q, per),
    ];
    return rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, limit);
  }
}
