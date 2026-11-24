import { readFile } from 'node:fs/promises';

import { BpmnModdle } from 'bpmn-moddle';
import Linter from 'bpmnlint/lib/linter.js';

import type { BpmnlintConfig, Resolver } from '../index';
import { FINDING_SEVERITIES, type Finding, type FindingSeverity } from './report/LintReport';

/**
 * Lints one BPMN file the way the bpmnlint CLI does: a file that does not parse is one error,
 * every import warning is an error, and a rule that throws (`rule-error`) is an error too.
 */
export class BpmnFileLinter {
  private readonly moddle: BpmnModdle;

  constructor(
    private readonly config: BpmnlintConfig,
    private readonly resolver: Resolver,
  ) {
    this.moddle = new BpmnModdle(
      config.moddleExtensions as ConstructorParameters<typeof BpmnModdle>[0],
    );
  }

  async lint(file: string): Promise<Finding[]> {
    const xml = await readFile(file, 'utf8');

    let parsed: Awaited<ReturnType<BpmnModdle['fromXML']>>;
    try {
      parsed = await this.moddle.fromXML(xml);
    } catch (error) {
      return [{ severity: 'error', rule: 'parse-error', message: (error as Error).message }];
    }

    const importFindings = parsed.warnings.map((warning) =>
      this.finding(
        xml,
        'error',
        'import-warning',
        warning.message.split(/\n/)[0] ?? '',
        warning.element?.id,
      ),
    );

    const linter = new Linter({ config: this.config, resolver: this.resolver });
    const results = await linter.lint(parsed.rootElement);
    const ruleFindings = Object.entries(results).flatMap(([rule, reports]) =>
      reports.map((report) =>
        this.finding(xml, this.severityOf(report.category), rule, report.message, report.id),
      ),
    );

    return [...importFindings, ...ruleFindings].sort(
      (left, right) =>
        FINDING_SEVERITIES.indexOf(left.severity) - FINDING_SEVERITIES.indexOf(right.severity) ||
        (left.line ?? Infinity) - (right.line ?? Infinity),
    );
  }

  /**
   * bpmnlint's report category as a severity. A rule that threw (`rule-error`) is an error.
   */
  private severityOf(category: string | undefined): FindingSeverity {
    return FINDING_SEVERITIES.find((severity) => severity === category) ?? 'error';
  }

  private finding(
    xml: string,
    severity: FindingSeverity,
    rule: string,
    message: string,
    elementId: string | undefined,
  ): Finding {
    if (!elementId) {
      return { severity, rule, message };
    }
    const line = this.lineOf(xml, elementId);
    return line === undefined
      ? { severity, rule, elementId, message }
      : { severity, rule, elementId, line, message };
  }

  /**
   * The 1-based line of the element's `id="…"` attribute. DI shapes reference an element with
   * `bpmnElement="…"`, so the first `id=` match is the element itself.
   */
  private lineOf(xml: string, elementId: string): number | undefined {
    const escapedId = elementId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`\\sid=(["'])${escapedId}\\1`).exec(xml);
    if (!match) {
      return undefined;
    }
    return xml.slice(0, match.index).split('\n').length;
  }
}
