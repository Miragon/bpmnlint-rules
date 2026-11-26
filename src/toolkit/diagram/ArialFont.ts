/**
 * Font units per em of Arial; every metric below is in these units.
 */
const UNITS_PER_EM = 2048;

/**
 * Advance widths of U+0020 to U+007E.
 */
const BASIC_LATIN_ADVANCES: readonly number[] = [
  569, 569, 727, 1139, 1139, 1821, 1366, 391, 682, 682, 797, 1196, 569, 682, 569, 569, 1139, 1139,
  1139, 1139, 1139, 1139, 1139, 1139, 1139, 1139, 569, 569, 1196, 1196, 1196, 1139, 2079, 1366,
  1366, 1479, 1479, 1366, 1251, 1593, 1479, 569, 1024, 1366, 1139, 1706, 1479, 1593, 1366, 1593,
  1479, 1366, 1251, 1479, 1366, 1933, 1366, 1366, 1251, 569, 569, 569, 961, 1139, 682, 1139, 1139,
  1024, 1139, 1139, 569, 1139, 1139, 455, 455, 1024, 455, 1706, 1139, 1139, 1139, 1139, 682, 1024,
  569, 1139, 1024, 1479, 1024, 1024, 1024, 684, 532, 684, 1196,
];

/**
 * Advance widths of U+00A0 to U+00FF.
 */
const LATIN_1_ADVANCES: readonly number[] = [
  569, 682, 1139, 1139, 1139, 1139, 532, 1139, 682, 1509, 758, 1139, 1196, 0, 1509, 1131, 819, 1124,
  682, 682, 682, 1180, 1100, 682, 682, 682, 748, 1139, 1708, 1708, 1708, 1251, 1366, 1366, 1366,
  1366, 1366, 1366, 2048, 1479, 1366, 1366, 1366, 1366, 569, 569, 569, 569, 1479, 1479, 1593, 1593,
  1593, 1593, 1593, 1196, 1593, 1479, 1479, 1479, 1479, 1366, 1366, 1251, 1139, 1139, 1139, 1139,
  1139, 1139, 1821, 1024, 1139, 1139, 1139, 1139, 569, 569, 569, 569, 1139, 1139, 1139, 1139, 1139,
  1139, 1139, 1124, 1251, 1139, 1139, 1139, 1139, 1024, 1139, 1024,
];

const PUNCTUATION_ADVANCES: Readonly<Record<string, number>> = {
  '\u2013': 1139,
  '\u2014': 2048,
  '\u2018': 455,
  '\u2019': 455,
  '\u201a': 455,
  '\u201c': 682,
  '\u201d': 682,
  '\u201e': 682,
  '\u2026': 2048,
  '\u20ac': 1139,
  '\u2022': 717,
};

/**
 * The kerning pairs Chrome applies, keyed by the two characters.
 */
const KERNING: Readonly<Record<string, number>> = {
  '11': -152,
  AT: -152,
  AV: -152,
  AW: -76,
  AY: -152,
  Av: -37,
  Aw: -37,
  Ay: -37,
  'A\u00a0': -113,
  'A\u2019': -152,
  'F,': -227,
  'F.': -227,
  FA: -113,
  LT: -152,
  LV: -152,
  LW: -152,
  LY: -152,
  Ly: -76,
  'L\u00a0': -76,
  'L\u2019': -113,
  'P,': -264,
  'P.': -264,
  PA: -152,
  'P\u00a0': -37,
  RT: -37,
  RV: -37,
  RW: -37,
  RY: -37,
  'T,': -227,
  'T-': -113,
  'T.': -227,
  'T:': -227,
  'T;': -227,
  TA: -152,
  TO: -37,
  Ta: -227,
  Tc: -227,
  Te: -227,
  Ti: -76,
  To: -227,
  Tr: -76,
  Ts: -227,
  Tu: -76,
  Tw: -113,
  Ty: -113,
  'T\u00a0': -37,
  'V,': -188,
  'V-': -113,
  'V.': -188,
  'V:': -76,
  'V;': -76,
  VA: -152,
  Va: -152,
  Ve: -113,
  Vi: -37,
  Vo: -113,
  Vr: -76,
  Vu: -76,
  Vy: -76,
  'W,': -113,
  'W-': -37,
  'W.': -113,
  'W:': -37,
  'W;': -37,
  WA: -76,
  Wa: -76,
  We: -37,
  Wo: -37,
  Wr: -37,
  Wu: -37,
  Wy: -18,
  'Y,': -264,
  'Y-': -188,
  'Y.': -264,
  'Y:': -113,
  'Y;': -133,
  YA: -152,
  Ya: -152,
  Ye: -188,
  Yi: -76,
  Yo: -188,
  Yp: -152,
  Yq: -188,
  Yu: -113,
  Yv: -113,
  'Y\u00a0': -37,
  ff: -37,
  'f\u2019': 37,
  'r,': -113,
  'r.': -113,
  'r\u2019': 76,
  'v,': -152,
  'v.': -152,
  'w,': -113,
  'w.': -113,
  'y,': -152,
  'y.': -152,
  '\u00a0A': -113,
  '\u00a0T': -37,
  '\u00a0Y': -37,
  '\u2018\u2018': -37,
  '\u2019s': -37,
  '\u2019\u00a0': -76,
  '\u2019\u2019': -37,
};

/**
 * Arial Regular, the font bpmn-js draws labels in. It works out how wide a text is in this font,
 * so a rule can predict from the BPMN file alone where bpmn-js breaks a label, without a browser.
 *
 * The metrics are the ones Chrome reports through `CanvasRenderingContext2D.measureText`, the call
 * diagram-js measures label text with: the advance width of every character in Basic Latin,
 * Latin-1 and common punctuation, and the kerning pairs Chrome applies between them. Chrome
 * measures a tab and a carriage return as a space. A text with any other character has no known
 * width, so callers can skip it instead of guessing.
 */
export class ArialFont {
  private readonly sizePx: number;

  constructor(sizePx: number) {
    this.sizePx = sizePx;
  }

  /**
   * The width of `text` in pixels, kerning included, or `undefined` when the text holds a
   * character without known metrics.
   */
  width(text: string): number | undefined {
    let units = 0;

    for (let index = 0; index < text.length; index++) {
      const charUnits = this.advanceUnits(text[index]!);

      if (charUnits === undefined) {
        return undefined;
      }

      units += charUnits + (KERNING[text.slice(index, index + 2)] ?? 0);
    }

    return (units * this.sizePx) / UNITS_PER_EM;
  }

  private advanceUnits(char: string): number | undefined {
    const code = char.charCodeAt(0);

    if (code === 0x09 || code === 0x0d) {
      return BASIC_LATIN_ADVANCES[0];
    }

    if (code >= 0x20 && code <= 0x7e) {
      return BASIC_LATIN_ADVANCES[code - 0x20];
    }

    if (code >= 0xa0 && code <= 0xff) {
      return LATIN_1_ADVANCES[code - 0xa0];
    }

    return PUNCTUATION_ADVANCES[char];
  }
}
