import { resolveCase } from '../../src/lib/naming';

// https://github.com/Miragon/bpmnlint-rules/issues/77 -- a 'case' value that is an
// Object.prototype key used to be read off the prototype chain, so CASES['toString']
// returned a function and the rule crashed on pattern.test.
const PROTOTYPE_KEYS = ['toString', 'constructor', 'hasOwnProperty', 'valueOf', '__proto__'];

describe('resolveCase', () => {
  it('returns the configured spec for a known case name', () => {
    expect(resolveCase('camelCase').label).toBe('camelCase');
    expect(resolveCase('snake_case').pattern).toBeInstanceOf(RegExp);
  });

  it('never reads inherited Object.prototype keys as case specs', () => {
    for (const name of PROTOTYPE_KEYS) {
      expect(resolveCase(name)).toEqual(resolveCase('PascalCase'));
    }
  });

  it('falls back to the PascalCase spec for unknown case names', () => {
    expect(resolveCase('camelcase').label).toBe('PascalCase');
  });
});
