import type { FindingSeverity, LintReport } from './LintReport';
import type { ReportFormatter } from './ReportFormatter';
import { escapeWorkflowCommandData, escapeWorkflowCommandProperty } from './utils/escaping';

/**
 * GitHub Actions workflow commands, one per finding, so GitHub annotates the file (at the
 * element's line when known). Paths must be relative to the repository root — run with
 * `--path-base "$GITHUB_WORKSPACE"`.
 */
export class GithubAnnotationFormatter implements ReportFormatter {
  format(report: LintReport): string {
    const commands = report.files.flatMap((file) =>
      file.findings.map((finding) => {
        const properties = [`file=${escapeWorkflowCommandProperty(file.path)}`];
        if (finding.line !== undefined) {
          properties.push(`line=${finding.line}`);
        }
        properties.push(`title=${escapeWorkflowCommandProperty(finding.rule)}`);

        const element = finding.elementId ? `${finding.elementId}: ` : '';
        const message = escapeWorkflowCommandData(`${element}${finding.message}`);
        return `::${this.command(finding.severity)} ${properties.join(',')}::${message}`;
      }),
    );
    return commands.length > 0 ? `${commands.join('\n')}\n` : '';
  }

  private command(severity: FindingSeverity): string {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      default:
        return 'notice';
    }
  }
}
