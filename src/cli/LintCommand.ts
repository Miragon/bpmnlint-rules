import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { BpmnFileLinter } from './BpmnFileLinter';
import { BpmnFileSelector } from './BpmnFileSelector';
import { CliArguments, type FormatName } from './CliArguments';
import { FallbackResolver } from './FallbackResolver';
import { LintConfigLoader } from './LintConfigLoader';
import { GithubAnnotationFormatter } from './report/GithubAnnotationFormatter';
import { JsonFormatter } from './report/JsonFormatter';
import { type FileReport, LintReport } from './report/LintReport';
import { MarkdownFormatter } from './report/MarkdownFormatter';
import type { ReportFormatter } from './report/ReportFormatter';
import { TextFormatter } from './report/TextFormatter';
import { UsageError } from './UsageError';

/**
 * Where a run reads from and writes to — the process in the bin, plain values in tests.
 */
export interface CommandEnvironment {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly stdout: { write(text: string): unknown };
  readonly stderr: { write(text: string): unknown };
}

/**
 * The exit codes of `miragon-bpmnlint`.
 */
const ExitCode = { clean: 0, errorFindings: 1, usageError: 2 } as const;

/**
 * One `miragon-bpmnlint` run: parse the arguments, pick the config and the files, lint them, write
 * every requested format and return the exit code. Knows nothing about any CI system; adapters
 * (the GitHub Action, a GitLab job) only choose files, formats and where the output goes.
 */
export class LintCommand {
  constructor(private readonly environment: CommandEnvironment) {}

  async run(): Promise<number> {
    try {
      return await this.lint(CliArguments.parse(this.environment.argv));
    } catch (error) {
      const prefix = error instanceof UsageError ? '' : 'Error: ';
      this.environment.stderr.write(`miragon-bpmnlint: ${prefix}${(error as Error).message}\n`);
      return ExitCode.usageError;
    }
  }

  private async lint(args: CliArguments): Promise<number> {
    if (args.help) {
      this.environment.stdout.write(CliArguments.usage);
      return ExitCode.clean;
    }

    const { cwd } = this.environment;
    const { config, source } = new LintConfigLoader(cwd).load(args);
    const candidates = args.filesFrom === undefined ? undefined : this.readList(args.filesFrom);
    const files = new BpmnFileSelector(cwd).select(args.patterns, candidates);

    const linter = new BpmnFileLinter(config, FallbackResolver.forDirectory(cwd));
    const pathBase = path.resolve(cwd, args.pathBase ?? '.');
    const fileReports: FileReport[] = [];
    for (const file of files) {
      fileReports.push({
        path: path.relative(pathBase, file).split(path.sep).join('/'),
        findings: await linter.lint(file),
      });
    }

    const report = new LintReport(source, fileReports);
    for (const output of args.outputs) {
      this.write(this.formatter(output.format, args.maxLength).format(report), output.file);
    }
    return report.errorCount > 0 ? ExitCode.errorFindings : ExitCode.clean;
  }

  private readList(file: string): string[] {
    let text: string;
    try {
      text = readFileSync(path.resolve(this.environment.cwd, file), 'utf8');
    } catch {
      throw new UsageError(`Cannot read --files-from ${file}.`);
    }
    return text.split(/\r?\n/).filter((line) => line.trim() !== '');
  }

  private formatter(format: FormatName, maxLength: number | undefined): ReportFormatter {
    switch (format) {
      case 'text':
        return new TextFormatter();
      case 'json':
        return new JsonFormatter();
      case 'markdown':
        return new MarkdownFormatter(maxLength);
      case 'github':
        return new GithubAnnotationFormatter();
    }
  }

  private write(text: string, file: string | undefined): void {
    if (file === undefined) {
      this.environment.stdout.write(text);
      return;
    }
    const target = path.resolve(this.environment.cwd, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  }
}
