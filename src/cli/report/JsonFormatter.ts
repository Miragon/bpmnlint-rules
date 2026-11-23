import type { LintReport } from './LintReport';
import type { ReportFormatter } from './ReportFormatter';

/**
 * The machine-readable contract: {@link LintReport.toJSON}, pretty-printed.
 */
export class JsonFormatter implements ReportFormatter {
  format(report: LintReport): string {
    return `${JSON.stringify(report, null, 2)}\n`;
  }
}
