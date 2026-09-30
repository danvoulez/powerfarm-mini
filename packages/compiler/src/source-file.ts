import { dirname, normalize, resolve } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";

export class SourceFile {
  readonly path: string;
  readonly content: string;
  constructor(path: string, content: string) { this.path = path; this.content = content; }
}

export class Compiler {
  private files: SourceFile[] = [];

  emit(path: string, content: string): void { this.files.push(new SourceFile(path, content)); }
  drain(): SourceFile[] { const out=[...this.files]; this.files.length=0; return out; }

  async finalize(outputDir: string, files: SourceFile[], clean = false): Promise<SourceFile[]> {
    const root = resolve(outputDir);
    if (clean) await rm(root, { recursive: true, force: true });
    const writes: Promise<void>[] = [];
    for (const file of files) {
      const target = resolve(root, normalize(file.path));
      if (!(target === root || target.startsWith(root + "/"))) throw new Error(`Path traversal rejected: ${file.path}`);
      await mkdir(dirname(target), { recursive: true });
      writes.push(writeFile(target, file.content, "utf8"));
    }
    await Promise.all(writes);
    return files;
  }
}
