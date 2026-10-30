/**
 * The ESM half of the distro smoke test. `smoke.cjs` copies this file into its throwaway consumer
 * project, next to the `bad.bpmn` and `good.bpmn` fixtures, and runs it there, so every import below
 * resolves from the installed tarball through Node's own ESM loader — no bundler to paper over an
 * extension-less deep import or a JSON import without an import attribute.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { Linter } from 'bpmnlint';
import { createModdle } from 'bpmnlint/lib/testers/helper.js';
import { createBundledResolver, getDefaultLintConfig } from '@miragon/bpmnlint-plugin-rules';
import noGeneratedIds from '@miragon/bpmnlint-plugin-rules/rules/no-generated-ids';
import * as camunda7 from '@miragon/bpmnlint-plugin-rules/camunda-7';
import * as camunda8 from '@miragon/bpmnlint-plugin-rules/camunda-8';
import { lint as lintInOneWalk } from '@miragon/bpmnlint-plugin-rules/engine';

const MIRAGON_ALL = { extends: ['bpmnlint:recommended', 'plugin:@miragon/rules/all'] };

/** Lints a fixture next to this file through the bundled resolver alone. */
async function lint(fixture, config) {
  const xml = await readFile(new URL(fixture, import.meta.url), 'utf8');
  const { root } = await createModdle(xml, config.moddleExtensions);
  const linter = new Linter({ config, resolver: createBundledResolver() });

  return linter.lint(root);
}

const errorsOf = (reports) =>
  Object.values(reports)
    .flat()
    .filter((report) => report.category === 'error' || report.category === 'rule-error');

assert.equal(typeof noGeneratedIds, 'function', 'the rules/* subpath must export the rule factory');

const bad = await lint('./bad.bpmn', MIRAGON_ALL);
assert.ok(
  Object.keys(bad).some((rule) => rule.endsWith('no-generated-ids')),
  `a bad model should trip no-generated-ids, got: ${JSON.stringify(Object.keys(bad))}`,
);

const good = await lint('./good.bpmn', MIRAGON_ALL);
assert.deepEqual(errorsOf(good), [], 'a clean model should report no error');

// The engine layer: the moddle descriptor is inlined data, and each layer lints without a rule
// error.
const c8 = getDefaultLintConfig({ engine: 'c8' });
assert.equal(typeof c8.moddleExtensions.zeebe, 'object', 'the zeebe descriptor must be inlined');
for (const extendsLayer of c8.extends) {
  const reports = await lint('./good.bpmn', { ...c8, extends: [extendsLayer] });
  const ruleErrors = Object.values(reports)
    .flat()
    .filter((report) => report.category === 'rule-error');
  assert.deepEqual(ruleErrors, [], `${extendsLayer} must lint without a rule error`);
}

// The per-engine entry points: camunda-compat's rules, run in one walk by the engine entry.
for (const [engine, { compatRules, moddleExtensions }] of [
  ['c7', camunda7],
  ['c8', camunda8],
]) {
  const xml = await readFile(new URL('./good.bpmn', import.meta.url), 'utf8');
  const { root } = await createModdle(xml, moddleExtensions);
  const reports = lintInOneWalk(root, compatRules());
  const ruleErrors = Object.values(reports)
    .flat()
    .filter((report) => report.category === 'rule-error');
  assert.deepEqual(ruleErrors, [], `the ${engine} entry must lint without a rule error`);
}

console.log('  -> ESM path: import() loads the package and lints through the bundled resolver');
