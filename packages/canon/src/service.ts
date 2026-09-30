import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface CanonDocument {
  id: string;
  title: string;
  status: string;
  version: string;
  effective: string;
  filename: string;
  body: string;
}

export class CanonService {
  readonly canonDir: string;
  constructor(canonDir: string) { this.canonDir = canonDir; }

  list(): Omit<CanonDocument, "body">[] {
    return this.loadAll().map(({ body: _body, ...metadata }) => metadata);
  }

  get(id: string): CanonDocument | undefined {
    return this.loadAll().find((doc) => doc.id === id.toUpperCase());
  }

  private loadAll(): CanonDocument[] {
    return readdirSync(this.canonDir)
      .filter((name) => /^PF-0[1-5].*\.md$/.test(name))
      .sort()
      .map((filename) => {
        const body = readFileSync(join(this.canonDir, filename), "utf8");
        const id = (body.match(/\| \*\*DOCUMENT\*\*\s+\|\s+(PF-\d+)/)?.[1] ?? filename.slice(0, 5)).trim();
        const title = body.split(/\r?\n/).find((line, i, all) => i > 0 && line.trim() && !line.startsWith("**") && !line.startsWith("|"))?.trim() ?? id;
        const status = body.match(/\| \*\*STATUS\*\*\s+\|\s+\*\*([^*]+)\*\*/)?.[1]?.trim() ?? "UNKNOWN";
        const version = body.match(/\| \*\*VERSION\*\*\s+\|\s+([^|\n]+)/)?.[1]?.trim() ?? "unknown";
        const effective = body.match(/\| \*\*EFFECTIVE\*\*\s+\|\s+([^|\n]+)/)?.[1]?.trim() ?? "unknown";
        return { id, title, status, version, effective, filename, body };
      });
  }
}
