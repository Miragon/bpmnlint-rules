import type { FileReport, FindingSeverity, LintReport } from './LintReport';
import type { ReportFormatter } from './ReportFormatter';
import { escapeMarkdownText, markdownCodeSpan } from './utils/escaping';

const MIRAGON_RULE_PREFIX = '@miragon/rules/';
const MIRAGON_RULE_DOCS = 'https://miragon.github.io/bpmnlint-rules/rules/';

/**
 * A markdown report for a pull/merge request comment or a job summary: a headline with the
 * counts, then one table per file with findings. Everything taken from the model is escaped.
 *
 * With a `maxLength`, file tables that would overflow it are left out and a note says how many
 * findings are not shown, because comment bodies have a size limit (65,536 characters on GitHub).
 */
export class MarkdownFormatter implements ReportFormatter {
  constructor(private readonly maxLength?: number) {}

  format(report: LintReport): string {
    const header = `${this.headline(report)}\n\n${this.subline(report)}\n`;
    const sections = report.filesWithFindings.map((file) => this.fileSection(file));

    let body = header;
    let shownFindings = 0;
    for (const [index, section] of sections.entries()) {
      const omittedNote = this.omittedNote(report.findingCount - shownFindings);
      if (this.maxLength !== undefined && (body + section + omittedNote).length > this.maxLength) {
        return body + omittedNote;
      }
      body += section;
      shownFindings += report.filesWithFindings[index]?.findings.length ?? 0;
    }
    return body;
  }

  private headline(report: LintReport): string {
    if (report.files.length === 0) {
      return '### ✅ BPMN lint: no BPMN files to lint';
    }
    if (report.findingCount === 0) {
      return '### ✅ BPMN lint: no findings';
    }
    const icon = report.errorCount > 0 ? '🔴' : '🟡';
    const counts = [
      this.count(report.errorCount, 'error', 'errors'),
      this.count(report.warningCount, 'warning', 'warnings'),
    ];
    if (report.infoCount > 0) {
      counts.push(this.count(report.infoCount, 'info', 'infos'));
    }
    return `### ${icon} BPMN lint: ${counts.join(', ')}`;
  }

  private subline(report: LintReport): string {
    const linted = this.count(report.files.length, 'file', 'files');
    const withFindings = report.filesWithFindings.length;
    const findingsPart = withFindings > 0 ? `, ${withFindings} with findings` : '';
    return `Config ${markdownCodeSpan(report.configSource)} · ${linted} linted${findingsPart}`;
  }

  private fileSection(file: FileReport): string {
    const rows = file.findings.map((finding) =>
      [
        this.severityLabel(finding.severity),
        finding.elementId ? markdownCodeSpan(finding.elementId) : '–',
        this.ruleCell(finding.rule),
        escapeMarkdownText(finding.message),
      ].join(' | '),
    );
    return [
      '',
      `**${escapeMarkdownText(file.path)}**`,
      '',
      '| Severity | Element | Rule | Message |',
      '| --- | --- | --- | --- |',
      ...rows.map((row) => `| ${row} |`),
      '',
    ].join('\n');
  }

  private severityLabel(severity: FindingSeverity): string {
    switch (severity) {
      case 'error':
        return '🔴 error';
      case 'warn':
        return '🟡 warn';
      default:
        return '🔵 info';
    }
  }

  private ruleCell(rule: string): string {
    if (!rule.startsWith(MIRAGON_RULE_PREFIX)) {
      return markdownCodeSpan(rule);
    }
    const ruleName = rule.slice(MIRAGON_RULE_PREFIX.length);
    if (!/^[a-z0-9-]+$/.test(ruleName)) {
      return markdownCodeSpan(rule);
    }
    return `[${markdownCodeSpan(ruleName)}](${MIRAGON_RULE_DOCS}${ruleName})`;
  }

  private omittedNote(omittedFindings: number): string {
    return `\n_${this.count(omittedFindings, 'more finding', 'more findings')} not shown (size limit); see the full report in the job log._\n`;
  }

  private count(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`;
  }
}
