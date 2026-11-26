import { describe, expect, it } from 'vitest';

import { arialTextWidth } from '../../src/toolkit/diagram/utils/arialMetrics';
import { brokenLabelWord } from '../../src/toolkit/diagram/utils/externalLabelLayout';

describe('arialTextWidth', () => {
  it('sums the advance widths at the font size', () => {
    expect(arialTextWidth('Confirmation', 11)).toBeCloseTo(62.358, 3);
  });

  it('applies the kerning pairs', () => {
    expect(arialTextWidth('Tea', 11)).toBeCloseTo(17.735, 3);
  });

  it('is undefined for a character without known metrics', () => {
    expect(arialTextWidth('Auftrag 受注', 11)).toBeUndefined();
  });
});

describe('brokenLabelWord', () => {
  it('breaks a single word that is a fraction of a pixel too wide', () => {
    expect(brokenLabelWord('yes', 17)).toEqual({ word: 'yes', requiredWidth: 18 });
  });

  it('breaks a word that fits on its own, because bpmn-js shortens the line by character count', () => {
    expect(brokenLabelWord('Subscription requested', 61)).toEqual({
      word: 'Subscription',
      requiredWidth: 62,
    });
  });

  it('keeps every word whole in a label as wide as bpmn-js sizes it', () => {
    expect(brokenLabelWord('Subscription requested', 64)).toBeUndefined();
  });

  it('reports the word bpmn-js breaks on a later line', () => {
    expect(brokenLabelWord('Order received', 40)).toEqual({ word: 'received', requiredWidth: 42 });
  });

  it('breaks after a hyphen before it breaks a word', () => {
    expect(brokenLabelWord('Re-check', 29)).toBeUndefined();
  });

  it('breaks at a soft hyphen', () => {
    expect(brokenLabelWord('Auftrags\u00ADbestätigung', 60)).toBeUndefined();
  });

  it('starts a new line at every explicit line break', () => {
    expect(brokenLabelWord('Order\nreceived', 42)).toBeUndefined();
  });

  it('keeps a kerned word whole in a box narrower than its unkerned glyphs', () => {
    expect(brokenLabelWord('Tea', 18)).toBeUndefined();
  });

  it('is undefined for text it cannot measure', () => {
    expect(brokenLabelWord('受注', 5)).toBeUndefined();
  });
});
