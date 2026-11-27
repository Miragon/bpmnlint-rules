import { describe, expect, it } from 'vitest';

import { ExternalLabelLayout } from '../../src/toolkit/diagram/ExternalLabelLayout';

describe('ExternalLabelLayout', () => {
  it('breaks a single word that is a fraction of a pixel too wide', () => {
    expect(new ExternalLabelLayout('yes').brokenWord(17)).toEqual({
      word: 'yes',
      requiredWidth: 18,
    });
  });

  it('breaks a word that fits on its own, because bpmn-js shortens the line by character count', () => {
    expect(new ExternalLabelLayout('Subscription requested').brokenWord(61)).toEqual({
      word: 'Subscription',
      requiredWidth: 62,
    });
  });

  it('keeps every word whole in a label as wide as bpmn-js sizes it', () => {
    expect(new ExternalLabelLayout('Subscription requested').brokenWord(64)).toBeUndefined();
  });

  it('reports the word bpmn-js breaks on a later line', () => {
    expect(new ExternalLabelLayout('Order received').brokenWord(40)).toEqual({
      word: 'received',
      requiredWidth: 42,
    });
  });

  it('breaks after a hyphen before it breaks a word', () => {
    expect(new ExternalLabelLayout('Re-check').brokenWord(29)).toBeUndefined();
  });

  it('breaks at a soft hyphen', () => {
    expect(new ExternalLabelLayout('Auftrags\u00ADbestätigung').brokenWord(60)).toBeUndefined();
  });

  it('starts a new line at every explicit line break', () => {
    expect(new ExternalLabelLayout('Order\nreceived').brokenWord(42)).toBeUndefined();
  });

  it('keeps a kerned word whole in a box narrower than its unkerned glyphs', () => {
    expect(new ExternalLabelLayout('Tea').brokenWord(18)).toBeUndefined();
  });

  it('is undefined for text it cannot measure', () => {
    expect(new ExternalLabelLayout('受注').brokenWord(5)).toBeUndefined();
  });

  // The widths and heights below are what bpmn-js 18 itself wrote for these names.
  describe('drawnBounds', () => {
    it('rounds the stored position and width and sizes one line 14px tall', () => {
      expect(
        new ExternalLabelLayout('Order received').drawnBounds({
          x: 10.4,
          y: 20.6,
          width: 73,
          height: 40,
        }),
      ).toEqual({ x: 10, y: 21, width: 73, height: 14 });
    });

    it('sizes a label to the lines bpmn-js lays the text out in', () => {
      const bounds = { x: 0, y: 0, width: 89, height: 14 };

      expect(
        new ExternalLabelLayout('Versicherungsbedingungen geprüft').drawnBounds(bounds),
      ).toEqual({ ...bounds, height: 27 });
      expect(
        new ExternalLabelLayout('Versicherungs\u00ADbedingungen geprüft').drawnBounds({
          ...bounds,
          width: 74,
        }),
      ).toEqual({ ...bounds, width: 74, height: 40 });
    });

    it('is undefined for text it cannot measure', () => {
      expect(
        new ExternalLabelLayout('受注').drawnBounds({ x: 0, y: 0, width: 30, height: 14 }),
      ).toBeUndefined();
    });
  });
});
