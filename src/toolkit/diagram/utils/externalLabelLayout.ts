import { arialTextWidth } from './arialMetrics';

/**
 * bpmn-js draws external labels at its default font size minus one (`externalStyle` in
 * `lib/draw/TextRenderer.js`).
 */
const EXTERNAL_LABEL_FONT_SIZE_PX = 11;

const SOFT_BREAK = '\u00AD';
const WORD_SEPARATOR = /[\s\u00AD-]/;

export interface BrokenWord {
  /**
   * The word bpmn-js breaks across two lines.
   */
  word: string;
  /**
   * The smallest whole-pixel label width from which on no word breaks.
   */
  requiredWidth: number;
}

type MeasureText = (text: string) => number;

/**
 * Measures a line like `getTextBBox` in `diagram-js/lib/util/Text.js`: without trailing whitespace.
 */
const measureLine = (line: string): number | undefined =>
  line ? arialTextWidth(line.replace(/\s+$/, ''), EXTERNAL_LABEL_FONT_SIZE_PX) : 0;

/**
 * Ports `semanticShorten` from `diagram-js/lib/util/Text.js`, quirks included: it stops at the
 * first empty part and drops a hyphen that no longer fits together with the part before it.
 */
const semanticShorten = (line: string, maxLength: number): string => {
  const parts = line.split(/(\s|-|\u00AD)/g);
  const shortenedParts: string[] = [];
  let length = 0;

  if (parts.length > 1) {
    let part: string | undefined;

    while ((part = parts.shift())) {
      if (part.length + length < maxLength) {
        shortenedParts.push(part);
        length += part.length;
      } else {
        if (part === '-' || part === SOFT_BREAK) {
          shortenedParts.pop();
        }

        break;
      }
    }
  }

  if (shortenedParts.at(-1) === SOFT_BREAK) {
    shortenedParts[shortenedParts.length - 1] = '-';
  }

  return shortenedParts.join('');
};

/**
 * Ports `shortenLine` from `diagram-js/lib/util/Text.js`: it estimates how many characters fit by
 * their share of the line width, keeps whole words if it can and cuts the first word otherwise.
 */
const shortenLine = (line: string, width: number, maxWidth: number): string => {
  const length = Math.max(line.length * (maxWidth / width), 1);

  return semanticShorten(line, length) || line.slice(0, Math.max(Math.round(length - 1), 1));
};

const wordAround = (line: string, index: number): string => {
  let start = index;
  let end = index;

  while (start > 0 && !WORD_SEPARATOR.test(line[start - 1]!)) {
    start -= 1;
  }

  while (end < line.length && !WORD_SEPARATOR.test(line[end]!)) {
    end += 1;
  }

  return line.slice(start, end);
};

const isInsideWord = (line: string, index: number): boolean =>
  !WORD_SEPARATOR.test(line[index - 1]!) && !WORD_SEPARATOR.test(line[index]!);

/**
 * Lays `text` out the way `layoutText` in `diagram-js/lib/util/Text.js` does and returns the first
 * word it breaks inside, if any.
 */
const firstBrokenWord = (
  text: string,
  maxWidth: number,
  measure: MeasureText,
): string | undefined => {
  const lines = text.split(/\u00AD?\r?\n/);

  while (lines.length) {
    const originalLine = lines.shift()!;
    let fitLine = originalLine;
    let width = measure(fitLine);

    while (fitLine !== ' ' && fitLine !== '' && width > maxWidth && fitLine.length >= 2) {
      fitLine = shortenLine(fitLine, width, maxWidth);
      width = measure(fitLine);
    }

    if (fitLine.length < originalLine.length) {
      if (isInsideWord(originalLine, fitLine.length)) {
        return wordAround(originalLine, fitLine.length);
      }

      lines.unshift(originalLine.slice(fitLine.length).trim());
    }
  }

  return undefined;
};

/**
 * The word bpmn-js 18 breaks inside when it draws `text` as an external label `labelWidth` wide,
 * and the width that keeps every word whole. `undefined` when no word breaks, or when the text
 * holds a character without known font metrics, so its layout cannot be predicted.
 */
export const brokenLabelWord = (text: string, labelWidth: number): BrokenWord | undefined => {
  const lineWidths = text.split(/\u00AD?\r?\n/).map(measureLine);

  if (!lineWidths.every((width): width is number => width !== undefined)) {
    return undefined;
  }

  const measure: MeasureText = (line) => measureLine(line)!;
  const word = firstBrokenWord(text, labelWidth, measure);

  if (word === undefined) {
    return undefined;
  }

  // Every line fits whole from the widest one on, so search below it for the last width that
  // still breaks a word.
  const widestLine = Math.ceil(Math.max(...lineWidths));
  let requiredWidth = Math.floor(labelWidth) + 1;

  for (let width = widestLine - 1; width > labelWidth; width--) {
    if (firstBrokenWord(text, width, measure) !== undefined) {
      requiredWidth = width + 1;
      break;
    }
  }

  return { word, requiredWidth };
};
