import {
  describeValueNaming,
  matchesValueNaming,
  resolveCase,
  resolveValueNaming,
} from '../../src/lib/naming';

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

describe('resolveValueNaming', () => {
  it('defaults to camelCase segments joined by a dot', () => {
    const scheme = resolveValueNaming();

    expect(scheme).toEqual({ prefix: '', separator: '.', case: resolveCase('camelCase') });
    expect(describeValueNaming(scheme)).toBe('<camelCase>');
  });

  it('falls back to PascalCase for an unknown case name', () => {
    expect(resolveValueNaming({ case: 'toString' }).case).toBe(resolveCase('PascalCase'));
  });
});

describe('matchesValueNaming', () => {
  const billing = resolveValueNaming({ prefix: 'billing', separator: '.', case: 'camelCase' });

  it('describes the scheme the way a report states it', () => {
    expect(describeValueNaming(billing)).toBe('billing.<camelCase>');
  });

  it.each(['billing.validateInvoice', 'billing.paymentReceived'])('accepts %s', (value) => {
    expect(matchesValueNaming(value, billing)).toBe(true);
  });

  it.each(['validate-invoice', 'billing.ValidateInvoice', 'billing-validateInvoice', 'billing.'])(
    'rejects %s',
    (value) => {
      expect(matchesValueNaming(value, billing)).toBe(false);
    },
  );

  it('accepts several segments joined by the separator, each in the case', () => {
    expect(matchesValueNaming('billing.invoice.validate', billing)).toBe(true);
    expect(matchesValueNaming('billing.Invoice.validate', billing)).toBe(false);
    expect(matchesValueNaming('billing.invoice..validate', billing)).toBe(false);
  });

  it('accepts a namespaced value without a configured prefix', () => {
    const unprefixed = resolveValueNaming();

    expect(matchesValueNaming('miravelo.membershipRequested', unprefixed)).toBe(true);
    expect(matchesValueNaming('.membershipRequested', unprefixed)).toBe(false);
  });

  it('treats the name as one segment for an empty separator', () => {
    const joined = resolveValueNaming({ prefix: 'billing', separator: '' });

    expect(matchesValueNaming('billingvalidateInvoice', joined)).toBe(true);
    expect(matchesValueNaming('billingValidateInvoice', joined)).toBe(false);
  });
});
