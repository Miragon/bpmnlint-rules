import { resolveCase } from '../../src/lib/naming-cases';
import {
  describeValueNaming,
  isExpression,
  matchesValueNaming,
  resolveValueNaming,
} from '../../src/lib/naming-values';

describe('resolveValueNaming', () => {
  it('defaults to camelCase segments joined by a dot', () => {
    const scheme = resolveValueNaming();

    expect(scheme).toEqual({
      prefix: '',
      separator: '.',
      case: resolveCase('camelCase'),
      segments: undefined,
    });
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

describe('segments', () => {
  const twoSegments = resolveValueNaming({ segments: 2 });

  it('accepts exactly that number of segments', () => {
    expect(matchesValueNaming('billing.paymentReceived', twoSegments)).toBe(true);
    expect(matchesValueNaming('paymentReceived', twoSegments)).toBe(false);
    expect(matchesValueNaming('billing.invoice.paid', twoSegments)).toBe(false);
  });

  it('counts only the segments after the prefix', () => {
    const scheme = resolveValueNaming({ prefix: 'com.acme.billing', segments: 1 });

    expect(matchesValueNaming('com.acme.billing.validateInvoice', scheme)).toBe(true);
    expect(matchesValueNaming('com.acme.billing.invoice.validate', scheme)).toBe(false);
  });

  it('repeats the case placeholder in the description', () => {
    expect(describeValueNaming(twoSegments)).toBe('<camelCase>.<camelCase>');
    expect(describeValueNaming(resolveValueNaming({ prefix: 'billing', segments: 2 }))).toBe(
      'billing.<camelCase>.<camelCase>',
    );
  });

  it.each([0, -1, 1.5, '2', null])('ignores the value %s', (segments) => {
    const scheme = resolveValueNaming({ segments: segments as number });

    expect(scheme.segments).toBeUndefined();
    expect(matchesValueNaming('billing.invoice.paid', scheme)).toBe(true);
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
