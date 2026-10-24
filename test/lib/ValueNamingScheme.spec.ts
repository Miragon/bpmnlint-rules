import { isExpression, resolveCase, ValueNamingScheme } from '../../src/lib/naming';

describe('ValueNamingScheme', () => {
  it('defaults to camelCase segments joined by a dot', () => {
    const scheme = new ValueNamingScheme();

    expect(scheme.prefix).toBe('');
    expect(scheme.separator).toBe('.');
    expect(scheme.case).toBe(resolveCase('camelCase'));
    expect(scheme.segments).toBeUndefined();
    expect(scheme.describe()).toBe('<camelCase>');
  });

  it('falls back to PascalCase for an unknown case name', () => {
    expect(new ValueNamingScheme({ case: 'toString' }).case).toBe(resolveCase('PascalCase'));
  });
});

describe('ValueNamingScheme.matches', () => {
  const billing = new ValueNamingScheme({ prefix: 'billing', separator: '.', case: 'camelCase' });

  it('describes the scheme the way a report states it', () => {
    expect(billing.describe()).toBe('billing.<camelCase>');
  });

  it.each(['billing.validateInvoice', 'billing.paymentReceived'])('accepts %s', (value) => {
    expect(billing.matches(value)).toBe(true);
  });

  it.each(['validate-invoice', 'billing.ValidateInvoice', 'billing-validateInvoice', 'billing.'])(
    'rejects %s',
    (value) => {
      expect(billing.matches(value)).toBe(false);
    },
  );

  it('accepts several segments joined by the separator, each in the case', () => {
    expect(billing.matches('billing.invoice.validate')).toBe(true);
    expect(billing.matches('billing.Invoice.validate')).toBe(false);
    expect(billing.matches('billing.invoice..validate')).toBe(false);
  });

  it('accepts a namespaced value without a configured prefix', () => {
    const unprefixed = new ValueNamingScheme();

    expect(unprefixed.matches('miravelo.membershipRequested')).toBe(true);
    expect(unprefixed.matches('.membershipRequested')).toBe(false);
  });

  it('treats the name as one segment for an empty separator', () => {
    const joined = new ValueNamingScheme({ prefix: 'billing', separator: '' });

    expect(joined.matches('billingvalidateInvoice')).toBe(true);
    expect(joined.matches('billingValidateInvoice')).toBe(false);
  });
});

describe('segments', () => {
  const twoSegments = new ValueNamingScheme({ segments: 2 });

  it('accepts exactly that number of segments', () => {
    expect(twoSegments.matches('billing.paymentReceived')).toBe(true);
    expect(twoSegments.matches('paymentReceived')).toBe(false);
    expect(twoSegments.matches('billing.invoice.paid')).toBe(false);
  });

  it('counts only the segments after the prefix', () => {
    const scheme = new ValueNamingScheme({ prefix: 'com.acme.billing', segments: 1 });

    expect(scheme.matches('com.acme.billing.validateInvoice')).toBe(true);
    expect(scheme.matches('com.acme.billing.invoice.validate')).toBe(false);
  });

  it('repeats the case placeholder in the description', () => {
    expect(twoSegments.describe()).toBe('<camelCase>.<camelCase>');
    expect(new ValueNamingScheme({ prefix: 'billing', segments: 2 }).describe()).toBe(
      'billing.<camelCase>.<camelCase>',
    );
  });

  it.each([0, -1, 1.5, '2', null])('ignores the value %s', (segments) => {
    const scheme = new ValueNamingScheme({ segments: segments as number });

    expect(scheme.segments).toBeUndefined();
    expect(scheme.matches('billing.invoice.paid')).toBe(true);
  });
});

describe('isExpression', () => {
  it.each(['=concat("billing.", kind)', '${topicName}', '#{messageName}', 'billing.${tenant}'])(
    'treats %s as an expression',
    (value) => {
      expect(isExpression(value)).toBe(true);
    },
  );

  it.each(['billing.validateInvoice', 'payment received', 'a$b'])(
    'treats %s as a fixed value',
    (value) => {
      expect(isExpression(value)).toBe(false);
    },
  );
});
