import { describe, expect, it } from 'vitest';

import { estimatedLineCount, longestWord } from '../../src/toolkit/diagram/utils/text';

describe('longestWord', () => {
  it('splits at whitespace and hyphens', () => {
    expect(longestWord('Re-check confirmation')).toBe('confirmation');
  });

  it('splits at a soft hyphen', () => {
    expect(longestWord('Auftrags\u00ADbestätigung')).toBe('bestätigung');
  });

  it('is empty for blank text', () => {
    expect(longestWord('  ')).toBe('');
  });
});

describe('estimatedLineCount', () => {
  it('keeps text that fits on one line', () => {
    expect(estimatedLineCount('Checks the order', 86)).toBe(1);
  });

  it('wraps at the word that no longer fits', () => {
    expect(estimatedLineCount('parallel gateway (splitting)', 126)).toBe(2);
  });

  it('breaks after a hyphen', () => {
    expect(estimatedLineCount('order-confirmation', 60)).toBe(2);
  });

  it('counts every explicit line break', () => {
    expect(estimatedLineCount('first\n\nthird', 200)).toBe(3);
  });

  it('keeps a word wider than the line on one line', () => {
    expect(estimatedLineCount('Confirmation', 20)).toBe(1);
  });
});
