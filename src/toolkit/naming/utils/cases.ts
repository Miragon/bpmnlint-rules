/**
 * Naming cases: the accepted shapes for a name, shared by the element-id and the value naming
 * rules.
 */
export interface CaseSpec {
  readonly pattern: RegExp;
  readonly label: string;
}

/**
 * The `case` names the naming rules accept.
 */
export type CaseName = 'PascalCase' | 'camelCase' | 'snake_case' | 'kebab-case' | 'any';

/**
 * Accepted shapes for a name: the part of an ID after its prefix, or a segment of a value.
 */
const CASES: Readonly<Record<CaseName, CaseSpec>> = Object.freeze({
  PascalCase: Object.freeze({ pattern: /^[A-Z][A-Za-z0-9]*$/, label: 'PascalCase' }),
  camelCase: Object.freeze({ pattern: /^[a-z][A-Za-z0-9]*$/, label: 'camelCase' }),
  snake_case: Object.freeze({ pattern: /^[a-z0-9]+(_[a-z0-9]+)*$/, label: 'snake_case' }),
  'kebab-case': Object.freeze({ pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/, label: 'kebab-case' }),
  any: Object.freeze({ pattern: /^.+$/, label: 'any' }),
});

/**
 * Every case name `resolveCase` knows, for a tool that writes names in the configured case.
 */
export const CASE_NAMES: readonly CaseName[] = Object.freeze(Object.keys(CASES) as CaseName[]);

/**
 * The case spec for a configured `case` name; an unknown name falls back to PascalCase. The lookup
 * reads own properties only, so a name like `toString` or `__proto__` falls back too instead of
 * returning an `Object.prototype` member.
 */
export function resolveCase(caseName: string): CaseSpec {
  return Object.hasOwn(CASES, caseName) ? CASES[caseName as CaseName] : CASES.PascalCase;
}
