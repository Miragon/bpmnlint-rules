import type { LintReport } from './LintReport';

/**
 * Renders a {@link LintReport} as one output format of the CLI.
 */
export interface ReportFormatter {
  format(report: LintReport): string;
}
