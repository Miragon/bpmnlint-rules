/**
 * Value naming: the scheme a free-text technical value (a worker topic, a message name) must
 * follow, and how to check and describe it.
 */
import { resolveCase } from './naming-cases';
import type { CaseSpec } from './naming-cases';

export interface ValueNamingConfig {
  prefix?: string;
  separator?: string;
  case?: string;
  segments?: number;
}

export interface ValueNamingScheme {
  prefix: string;
  separator: string;
  case: CaseSpec;
  segments: number | undefined;
}

/**
 * The scheme a free-text technical value (a worker topic, a message name) must follow: an optional
 * `prefix`, then segments in `case` joined by `separator`. `segments` pins their exact number;
 * without it (or with anything but a positive integer) one or more pass. Defaults to camelCase
 * segments joined by `.`; an unknown case falls back like {@link resolveCase}.
 */
export function resolveValueNaming(config?: ValueNamingConfig): ValueNamingScheme {
  const { prefix = '', separator = '.', case: caseName = 'camelCase', segments } = config ?? {};
  const exactSegments = Number.isInteger(segments) && segments! > 0 ? segments : undefined;

  return { prefix, separator, case: resolveCase(caseName), segments: exactSegments };
}

/**
 * Is this value an expression the engine resolves at runtime, FEEL (`=…`) or JUEL (`${…}`,
 * `#{…}`)? Such a value has no fixed name to check.
 */
export function isExpression(value: string): boolean {
  return value.startsWith('=') || value.includes('${') || value.includes('#{');
}

/** `billing.` for the prefix `billing` and the separator `.`; empty without a prefix. */
function valueLead({ prefix, separator }: ValueNamingScheme): string {
  return prefix ? `${prefix}${separator}` : '';
}

/**
 * Does this value follow the scheme? `billing.validateInvoice` does for `billing` + `.` +
 * camelCase, and so does the namespaced `billing.invoice.validate`: every segment after the prefix
 * must match the case, and their number must equal `segments` when that is set.
 */
export function matchesValueNaming(value: string, scheme: ValueNamingScheme): boolean {
  const lead = valueLead(scheme);

  if (!value.startsWith(lead)) {
    return false;
  }

  const name = value.slice(lead.length);
  const segments = scheme.separator ? name.split(scheme.separator) : [name];
  const countMatches = scheme.segments === undefined || segments.length === scheme.segments;

  return countMatches && segments.every((segment) => scheme.case.pattern.test(segment));
}

/**
 * The scheme as a reader sees it in a report or a hint: `billing.<camelCase>`, or
 * `<camelCase>.<camelCase>` for two segments.
 */
export function describeValueNaming(scheme: ValueNamingScheme): string {
  const placeholder = `<${scheme.case.label}>`;
  const name = Array.from({ length: scheme.segments ?? 1 }, () => placeholder).join(
    scheme.separator,
  );

  return `${valueLead(scheme)}${name}`;
}
