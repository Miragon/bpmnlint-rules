// Renders every rule's example models to SVG for the docs.
//
// Each core rule ships a `valid.bpmn` / `invalid.bpmn` pair under `test/fixtures/rules/<rule>/`
// (the same models the `examples.spec.js` test lints). This script turns each into
// `docs/rules/assets/<rule>-<kind>.svg`, so the pictures in the docs are generated from the exact
// files the tests verify — never hand-drawn and never out of sync.
//
// Rendering uses `bpmn-to-image`, pulled on demand via `npx --yes` so it stays out of the
// package's dependency tree (first run downloads a headless Chromium).
//
//   npm run docs:examples

import { readdirSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = path.join(ROOT, 'test', 'fixtures', 'rules');
const ASSETS = path.join(ROOT, 'docs', 'rules', 'assets');

mkdirSync(ASSETS, { recursive: true });

const pairs = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) =>
    ['valid', 'invalid'].map((kind) => {
      const input = path.join(FIXTURES, entry.name, `${kind}.bpmn`);
      const output = path.join(ASSETS, `${entry.name}-${kind}.svg`);

      return `${input}:${output}`;
    }),
  );

console.log(`Rendering ${pairs.length} example model(s) to ${path.relative(ROOT, ASSETS)}/ …`);

execFileSync('npx', ['--yes', 'bpmn-to-image', ...pairs], { cwd: ROOT, stdio: 'inherit' });
