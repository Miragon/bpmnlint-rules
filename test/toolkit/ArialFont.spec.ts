import { describe, expect, it } from 'vitest';

import { ArialFont } from '../../src/toolkit/diagram/ArialFont';

describe('ArialFont', () => {
  it('sums the advance widths at the font size', () => {
    expect(new ArialFont(11).width('Confirmation')).toBeCloseTo(62.358, 3);
  });

  it('applies the kerning pairs', () => {
    expect(new ArialFont(11).width('Tea')).toBeCloseTo(17.735, 3);
  });

  it('is undefined for a character without known metrics', () => {
    expect(new ArialFont(11).width('Auftrag 受注')).toBeUndefined();
  });
});
