/**
 * The outcome of one `miragon-bpmnlint` run: every linted file with its findings. It is the single
 * model every output format renders, and its {@link LintReport.toJSON} shape is the CLI's
 * machine-readable contract (`--format json`), versioned by `schemaVersion`.
 */

/**
 * Every severity, the most severe first.
 */
export const FINDING_SEVERITIES = ['error', 'warn', 'info'] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export interface Finding {
  readonly severity: FindingSeverity;
  /**
   * The rule as named in the resolved config, e.g. `@miragon/rules/flow-crossing`.
   */
  readonly rule: string;
  readonly elementId?: string;
  /**
   * 1-based line of the element's `id` attribute in the file, when it could be located.
   */
  readonly line?: number;
  readonly message: string;
}

export interface FileReport {
  /**
   * The file's path relative to the run's path base, with `/` separators.
   */
  readonly path: string;
  readonly findings: readonly Finding[];
}

const SCHEMA_VERSION = 1;

export class LintReport {
  constructor(
    /**
     * Where the config came from, e.g. `.bpmnlintrc` or `preset strict`.
     */
    readonly configSource: string,
    readonly files: readonly FileReport[],
  ) {}

  get errorCount(): number {
    return this.countOf('error');
  }

  get warningCount(): number {
    return this.countOf('warn');
  }

  get infoCount(): number {
    return this.countOf('info');
  }

  get findingCount(): number {
    return this.files.reduce((sum, file) => sum + file.findings.length, 0);
  }

  get filesWithFindings(): readonly FileReport[] {
    return this.files.filter((file) => file.findings.length > 0);
  }

  toJSON() {
    return {
      schemaVersion: SCHEMA_VERSION,
      configSource: this.configSource,
      errorCount: this.errorCount,
      warningCount: this.warningCount,
      infoCount: this.infoCount,
      files: this.files,
    };
  }

  private countOf(severity: FindingSeverity): number {
    return this.files.reduce(
      (sum, file) => sum + file.findings.filter((finding) => finding.severity === severity).length,
      0,
    );
  }
}
