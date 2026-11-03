/**
 * Naming cases: the accepted shapes for a name, shared by the element-id and the value naming
 * rules.
 */
export interface CaseSpec {
  pattern: RegExp;
  label: string;
}

/** Accepted shapes for a name: the part of an ID after its prefix, or a segment of a value. */
const CASES: Record<string, CaseSpec> = {
  PascalCase: { pattern: /^[A-Z][A-Za-z0-9]*$/, label: 'PascalCase' },
  camelCase: { pattern: /^[a-z][A-Za-z0-9]*$/, label: 'camelCase' },
  snake_case: { pattern: /^[a-z0-9]+(_[a-z0-9]+)*$/, label: 'snake_case' },
  'kebab-case': { pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/, label: 'kebab-case' },
  any: { pattern: /^.+$/, label: 'any' },
};

const PASCAL_CASE: CaseSpec = CASES.PascalCase!;

/**
 * The case spec for a configured `case` name; an unknown name falls back to PascalCase. The lookup
 * reads own properties only, so a name like `toString` or `__proto__` falls back too instead of
 * returning an `Object.prototype` member.
 */
export function resolveCase(caseName: string): CaseSpec {
  const known = Object.prototype.hasOwnProperty.call(CASES, caseName);

  return (known ? CASES[caseName] : undefined) ?? PASCAL_CASE;
}
