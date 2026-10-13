import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The bpmnlint CLI reads `.bpmnlintrc` with `JSON.parse`, so a config example a reader copies from
 * the docs must be strict JSON: no comments, no trailing commas. Prettier adds trailing commas to
 * `jsonc` blocks, so a full config example is fenced as `json` and its explanation lives in prose.
 *
 * A "full config example" is a `json`/`jsonc` block with a top-level `extends` or `rules` key; a
 * fragment such as a single rule entry is not one.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function markdownFiles(): string[] {
  const docs = fs
    .readdirSync(path.join(REPO_ROOT, 'docs'), { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.md'))
    .filter(
      (file) =>
        !file.split(path.sep).some((part) => part.startsWith('.') || part === 'node_modules'),
    )
    .map((file) => path.join('docs', file));

  return ['README.md', ...docs];
}

interface CodeBlock {
  file: string;
  line: number;
  lang: string;
  body: string;
}

function jsonBlocks(file: string): CodeBlock[] {
  const lines = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8').split('\n');
  const blocks: CodeBlock[] = [];

  for (let index = 0; index < lines.length; index++) {
    const fence = /^```(json|jsonc)\s*$/.exec(lines[index] ?? '');
    if (!fence) {
      continue;
    }

    const end = lines.findIndex((text, position) => position > index && /^```\s*$/.test(text));
    if (end === -1) {
      throw new Error(`${file}:${index + 1}: unclosed code fence`);
    }

    blocks.push({
      file,
      line: index + 1,
      lang: fence[1]!,
      body: lines.slice(index + 1, end).join('\n'),
    });
    index = end;
  }

  return blocks;
}

const configExamples = markdownFiles()
  .flatMap(jsonBlocks)
  .filter(({ body }) => /^ {2}"(extends|rules)":/m.test(body));

describe('.bpmnlintrc examples in the docs', () => {
  it('finds the examples in README.md and docs/', () => {
    expect(configExamples.filter(({ file }) => file === 'README.md').length).toBeGreaterThan(0);
    expect(configExamples.filter(({ file }) => file !== 'README.md').length).toBeGreaterThan(0);
  });

  for (const { file, line, lang, body } of configExamples) {
    it(`${file}:${line} is strict JSON`, () => {
      expect(lang, 'fence a full config example as json, not jsonc').toBe('json');
      expect(() => JSON.parse(body)).not.toThrow();
    });
  }
});
