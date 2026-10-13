import { resolveCase } from '../../src/lib/naming';

describe('resolveCase', () => {
  it('returns the spec of every known case name', () => {
    for (const caseName of ['PascalCase', 'camelCase', 'snake_case', 'kebab-case', 'any']) {
      expect(resolveCase(caseName).label).toBe(caseName);
    }
  });

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
