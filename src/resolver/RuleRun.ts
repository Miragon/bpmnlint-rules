import type { ModdleElement, ReportDetails, ReportPath, Reporter } from '../lib/moddle';

type Visit = (node: ModdleElement, reporter: Reporter) => boolean | void;

/** A rule ready to run: the name its reports carry, its category and the rule instance. */
export interface RuleEntry {
  name: string;
  category: 'error' | 'warn' | 'info';
  rule: { check: Visit | { enter?: Visit; leave?: Visit }; meta?: unknown };
}

/** What bpmnlint reports for a rule: its messages, or one `rule-error` when the rule threw. */
export interface LintReport {
  id?: string;
  message: string;
  category: string;
  meta?: unknown;
  path?: ReportPath;
  [key: string]: unknown;
}

/** One rule of a single-pass run: its visitors, what it reported and whether it threw. */
export class RuleRun {
  readonly enter: Visit | undefined;
  readonly leave: Visit | undefined;
  private readonly messages: Record<string, unknown>[] = [];
  error: string | undefined;

  constructor(private readonly entry: RuleEntry) {
    const { check } = entry.rule;
    this.enter = typeof check === 'function' ? check : check?.enter;
    this.leave = typeof check === 'function' ? undefined : check?.leave;
    if (!this.enter && !this.leave) {
      throw new Error(`rule <${entry.name}> implements no check`);
    }
  }

  get name(): string {
    return this.entry.name;
  }

  /** bpmnlint's `Reporter`: a path array becomes `path`, details are spread into the report. */
  report(id: string, message: string, pathOrDetails?: ReportPath | ReportDetails): void {
    if (Array.isArray(pathOrDetails)) {
      this.messages.push({ id, message, path: pathOrDetails });
    } else if (pathOrDetails && typeof pathOrDetails === 'object') {
      this.messages.push({ id, message, ...pathOrDetails });
    } else {
      this.messages.push({ id, message });
    }
  }

  call(visit: Visit, node: ModdleElement): boolean | void {
    try {
      return visit(node, this);
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  reports(): LintReport[] {
    if (this.error !== undefined) {
      return [{ message: this.error, category: 'rule-error' }];
    }
    const { category } = this.entry;
    const { meta } = this.entry.rule;
    return this.messages.map((message) => ({ ...message, meta, category })) as LintReport[];
  }
}
