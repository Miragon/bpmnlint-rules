export const MIN_CHAR_WIDTH_PX = 5;

const estimatedWidth = (text: string): number => text.trimEnd().length * MIN_CHAR_WIDTH_PX;

export const longestWord = (text: string): string =>
  text
    .split(/[\s\u00AD-]+/)
    .reduce((longest, word) => (word.length > longest.length ? word : longest), '');

const wrappedLineCount = (line: string, availableWidth: number): number => {
  let lineCount = 1;
  let currentLine = '';

  for (const piece of line.split(/(?<=[\s\u00AD-])/)) {
    if (currentLine && estimatedWidth(currentLine + piece) > availableWidth) {
      lineCount += 1;
      currentLine = piece;
    } else {
      currentLine += piece;
    }
  }

  return lineCount;
};

export const estimatedLineCount = (text: string, availableWidth: number): number =>
  text.split(/\r?\n/).reduce((sum, line) => sum + wrappedLineCount(line, availableWidth), 0);
