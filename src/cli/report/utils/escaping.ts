/**
 * Escaping for text that comes from a linted model (element ids, messages, file names). A model is
 * input from whoever opened the pull request, so none of it may be able to inject markup, mention
 * people or issue workflow commands.
 */

/**
 * Plain markdown text, safe inside a table cell: no markup, no HTML, no `@` mentions.
 */
export function escapeMarkdownText(text: string): string {
  return text
    .replace(/\r?\n|\r/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\\`*_[\]|~#!]/g, (character) => `\\${character}`)
    .replace(/@/g, '@&#8203;');
}

/**
 * An inline code span, safe inside a table cell, whatever backticks or pipes the text holds.
 */
export function markdownCodeSpan(text: string): string {
  const singleLine = text.replace(/\r?\n|\r/g, ' ').replace(/\|/g, '\\|');
  const longestBacktickRun = Math.max(
    0,
    ...(singleLine.match(/`+/g) ?? []).map((run) => run.length),
  );
  const fence = '`'.repeat(longestBacktickRun + 1);
  const padding = longestBacktickRun > 0 ? ' ' : '';
  return `${fence}${padding}${singleLine}${padding}${fence}`;
}

/**
 * The message part of a GitHub workflow command (`::error ...::<data>`).
 */
export function escapeWorkflowCommandData(text: string): string {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

/**
 * A property value of a GitHub workflow command (`::error file=<value>,title=<value>::`).
 */
export function escapeWorkflowCommandProperty(text: string): string {
  return escapeWorkflowCommandData(text).replace(/:/g, '%3A').replace(/,/g, '%2C');
}
