import type { LintReport } from './LintReport';
import type { ReportFormatter } from './ReportFormatter';

/**
 * The console format: one line per finding under its file, then a summary line.
 */
export class TextFormatter implements ReportFormatter {
  format(report: LintReport): string {
    const lines: string[] = [];

    for (const file of report.filesWithFindings) {
      lines.push(file.path);
      for (const finding of file.findings) {
        const location = finding.line === undefined ? '' : `:${finding.line}`;
        const element = finding.elementId ?? '-';
        lines.push(
          `  ${element}${location}  ${finding.severity}  ${finding.message}  ${finding.rule}`,
        );
      }
      lines.push('');
    }

    lines.push(this.summary(report));
    return `${lines.join('\n')}\n`;
  }

  private summary(report: LintReport): string {
    const files = this.count(report.files.length, 'file', 'files');
    if (report.findingCount === 0) {
      return `No findings in ${files}.`;
    }
    const counts = [
      this.count(report.errorCount, 'error', 'errors'),
      this.count(report.warningCount, 'warning', 'warnings'),
      this.count(report.infoCount, 'info', 'infos'),
    ];
    return `${this.count(report.findingCount, 'finding', 'findings')} in ${files} (${counts.join(', ')}).`;
  }

  private count(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`;
  }
}
