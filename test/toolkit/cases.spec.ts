import { CASE_NAMES, resolveCase } from '../../src/toolkit/naming';

describe('CASE_NAMES', () => {
  it('lists exactly the case names resolveCase knows', () => {
    expect(CASE_NAMES).toEqual(['PascalCase', 'camelCase', 'snake_case', 'kebab-case', 'any']);

    for (const caseName of CASE_NAMES) {
      expect(resolveCase(caseName).label).toBe(caseName);
    }
  });
});

describe('resolveCase', () => {
  it('falls back to PascalCase for an unknown case name', () => {
    expect(resolveCase('camelcase')).toBe(resolveCase('PascalCase'));
  });

  // `Object.prototype` members are not case names: each must fall back like any unknown value
  // instead of returning a function or object without a `pattern`.
  it.each(['toString', 'constructor', 'valueOf', 'hasOwnProperty', '__proto__'])(
    'falls back to PascalCase for the Object.prototype key %s',
    (caseName) => {
      const spec = resolveCase(caseName);

      expect(spec).toBe(resolveCase('PascalCase'));
      expect(spec.pattern.test('ClaimMembership')).toBe(true);
    },
  );
});
