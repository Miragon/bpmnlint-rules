import { ArialFont } from './ArialFont';

/**
 * bpmn-js draws external labels at its default font size minus one (`externalStyle` in
 * `lib/draw/TextRenderer.js`).
 */
const LABEL_FONT = new ArialFont(11);

const SOFT_BREAK = '\u00AD';
const WORD_SEPARATOR = /[\s\u00AD-]/;
const EXPLICIT_LINE_BREAK = /\u00AD?\r?\n/;

export interface BrokenWord {
  /**
   * The word bpmn-js breaks across two lines.
   */
  word: string;
  /**
   * The smallest whole-pixel width above the label's at which bpmn-js keeps every word whole.
   */
  requiredWidth: number;
}

/**
 * The line layout bpmn-js 18 gives the text of an external label (the name below an event, a
 * gateway or beside a sequence flow), predicted without a browser. It ports `layoutText` from
 * `diagram-js/lib/util/Text.js` step by step, quirks included, and measures in {@link ArialFont}.
 *
 * It answers one question: does bpmn-js break a word of the text inside it when the label is a
 * given width wide? That is not the same as "is the word wider than the label": diagram-js
 * shortens a line that is too wide by the share of characters that fit, so a word can break even
 * though it would fit on its own.
 */
export class ExternalLabelLayout {
  private readonly text: string;
  private readonly lineWidths: readonly (number | undefined)[];

  constructor(text: string) {
    this.text = text;
    this.lineWidths = text.split(EXPLICIT_LINE_BREAK).map((line) => this.measure(line));
  }

  /**
   * The word bpmn-js breaks inside when the label is `labelWidth` wide, and the width that keeps
   * every word whole. `undefined` when no word breaks, or when the text holds a character without
   * known font metrics, so its layout cannot be predicted.
   */
  brokenWord(labelWidth: number): BrokenWord | undefined {
    const lineWidths = this.lineWidths;

    if (!lineWidths.every((width): width is number => width !== undefined)) {
      return undefined;
    }

    const word = this.firstBrokenWord(labelWidth);

    if (word === undefined) {
      return undefined;
    }

    // Search upwards for the first width without a break. A wider label has never broken a word
    // that a narrower one kept whole (checked against bpmn-js and thousands of random names), and
    // every line fits whole from the widest one on, so the search ends there at the latest.
    const widestLine = Math.ceil(Math.max(...lineWidths));
    let requiredWidth = Math.floor(labelWidth) + 1;

    while (requiredWidth < widestLine && this.firstBrokenWord(requiredWidth) !== undefined) {
      requiredWidth += 1;
    }

    return { word, requiredWidth };
  }

  /**
   * Lays the text out like `layoutText` and returns the first word it breaks inside, if any.
   */
  private firstBrokenWord(maxWidth: number): string | undefined {
    const lines = this.text.split(EXPLICIT_LINE_BREAK);

    while (lines.length) {
      const originalLine = lines.shift()!;
      let fitLine = originalLine;
      let width = this.measure(fitLine)!;

      while (fitLine !== ' ' && fitLine !== '' && width > maxWidth && fitLine.length >= 2) {
        fitLine = this.shortenLine(fitLine, width, maxWidth);
        width = this.measure(fitLine)!;
      }

      if (fitLine.length < originalLine.length) {
        if (this.isInsideWord(originalLine, fitLine.length)) {
          return this.wordAround(originalLine, fitLine.length);
        }

        lines.unshift(originalLine.slice(fitLine.length).trim());
      }
    }

    return undefined;
  }

  /**
   * Measures a line like `getTextBBox`: without trailing whitespace.
   */
  private measure(line: string): number | undefined {
    return line ? LABEL_FONT.width(line.replace(/\s+$/, '')) : 0;
  }

  /**
   * Ports `shortenLine`: it estimates how many characters fit by their share of the line width,
   * keeps whole words if it can and cuts the first word otherwise.
   */
  private shortenLine(line: string, width: number, maxWidth: number): string {
    const length = Math.max(line.length * (maxWidth / width), 1);

    return this.semanticShorten(line, length) || line.slice(0, Math.max(Math.round(length - 1), 1));
  }

  /**
   * Ports `semanticShorten`, quirks included: it stops at the first empty part and drops a hyphen
   * that no longer fits together with the part before it.
   */
  private semanticShorten(line: string, maxLength: number): string {
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
  }

  private isInsideWord(line: string, index: number): boolean {
    return !WORD_SEPARATOR.test(line[index - 1]!) && !WORD_SEPARATOR.test(line[index]!);
  }

  private wordAround(line: string, index: number): string {
    let start = index;
    let end = index;

    while (start > 0 && !WORD_SEPARATOR.test(line[start - 1]!)) {
      start -= 1;
    }

    while (end < line.length && !WORD_SEPARATOR.test(line[end]!)) {
      end += 1;
    }

    return line.slice(start, end);
  }
}
