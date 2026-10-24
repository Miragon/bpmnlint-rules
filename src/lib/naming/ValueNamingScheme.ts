import { resolveCase } from './utils/cases';
import type { CaseSpec } from './utils/cases';

export interface ValueNamingConfig {
  prefix?: string;
  separator?: string;
  case?: string;
  segments?: number;
}

/**
 * The scheme a free-text technical value (a worker topic, a message name) must follow: an optional
 * `prefix`, then segments in `case` joined by `separator`. `segments` pins their exact number;
 * without it (or with anything but a positive integer) one or more pass. Defaults to camelCase
 * segments joined by `.`; an unknown case falls back like {@link resolveCase}.
 */
export class ValueNamingScheme {
  readonly prefix: string;
  readonly separator: string;
  readonly case: CaseSpec;
  readonly segments: number | undefined;

  constructor(config?: ValueNamingConfig) {
    const { prefix = '', separator = '.', case: caseName = 'camelCase', segments } = config ?? {};

    this.prefix = prefix;
    this.separator = separator;
    this.case = resolveCase(caseName);
    this.segments = Number.isInteger(segments) && segments! > 0 ? segments : undefined;
  }

  /**
   * Does this value follow the scheme? `billing.validateInvoice` does for `billing` + `.` +
   * camelCase, and so does the namespaced `billing.invoice.validate`: every segment after the
   * prefix must match the case, and their number must equal `segments` when that is set.
   */
  matches(value: string): boolean {
    if (!value.startsWith(this.lead)) {
      return false;
    }

    const name = value.slice(this.lead.length);
    const segments = this.separator ? name.split(this.separator) : [name];
    const countMatches = this.segments === undefined || segments.length === this.segments;

    return countMatches && segments.every((segment) => this.case.pattern.test(segment));
  }

  /**
   * The scheme as a reader sees it in a report or a hint: `billing.<camelCase>`, or
   * `<camelCase>.<camelCase>` for two segments.
   */
  describe(): string {
    const placeholder = `<${this.case.label}>`;
    const name = Array.from({ length: this.segments ?? 1 }, () => placeholder).join(this.separator);

    return `${this.lead}${name}`;
  }

  /** `billing.` for the prefix `billing` and the separator `.`; empty without a prefix. */
  private get lead(): string {
    return this.prefix ? `${this.prefix}${this.separator}` : '';
  }
}
