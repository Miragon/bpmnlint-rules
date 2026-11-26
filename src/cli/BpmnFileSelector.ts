import { globSync, statSync } from 'node:fs';
import path from 'node:path';

const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git']);

/**
 * Turns the CLI's file arguments into the absolute paths to lint.
 *
 * An argument naming an existing file is taken literally (so `a[1].bpmn` is not read as a glob);
 * anything else is a glob relative to the working directory, skipping `node_modules` and `.git`.
 * With candidates (`--files-from`, e.g. the files a pull request changed), only matches that are
 * also candidates are kept, so one glob engine decides what "matches" means.
 */
export class BpmnFileSelector {
  constructor(private readonly cwd: string) {}

  select(patterns: readonly string[], candidates?: readonly string[]): string[] {
    const matches = new Set(patterns.flatMap((pattern) => this.expand(pattern)));
    const selected = candidates
      ? candidates
          .map((candidate) => path.resolve(this.cwd, candidate))
          .filter((file) => matches.has(file))
      : [...matches];
    return [...new Set(selected)].sort();
  }

  private expand(pattern: string): string[] {
    const literal = path.resolve(this.cwd, pattern);
    if (this.isFile(literal)) {
      return [literal];
    }
    return globSync(pattern, {
      cwd: this.cwd,
      exclude: (entry: string) => SKIPPED_DIRECTORIES.has(path.basename(entry)),
    })
      .map((match) => path.resolve(this.cwd, match))
      .filter((file) => this.isFile(file));
  }

  private isFile(file: string): boolean {
    try {
      return statSync(file).isFile();
    } catch {
      return false;
    }
  }
}
