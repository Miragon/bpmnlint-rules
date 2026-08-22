import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import Linter from 'bpmnlint/lib/linter';
import { createModdle } from 'bpmnlint/lib/testers/helper';

import type { RuleFactory } from '../../src/lib/moddle';

import { all } from '../../src/presets/all';
import { createBundledResolver } from '../../src/resolver/createBundledResolver';
import noGeneratedIds from '../../src/rules/miragon/no-generated-ids';
import elementIdNaming from '../../src/rules/miragon/element-id-naming';
import flowThroughElement from '../../src/rules/miragon/flow-through-element';
import flowConnectionSide from '../../src/rules/miragon/flow-connection-side';
import flowTargetAlignment from '../../src/rules/miragon/flow-target-alignment';
import flowCrossing from '../../src/rules/miragon/flow-crossing';
import flowOrthogonal from '../../src/rules/miragon/flow-orthogonal';

const RULES: Record<string, RuleFactory> = {
  'no-generated-ids': noGeneratedIds,
  'element-id-naming': elementIdNaming,
  'flow-through-element': flowThroughElement,
  'flow-connection-side': flowConnectionSide,
  'flow-target-alignment': flowTargetAlignment,
  'flow-crossing': flowCrossing,
  'flow-orthogonal': flowOrthogonal,
};

const EXAMPLES_DIR = fileURLToPath(new URL('../fixtures/rules', import.meta.url));

/**
 * A resolver that always hands back the single rule under test — the same trick bpmnlint's own
 * `RuleTester` uses, so an example model is linted through exactly the rule its folder is named
 * after, with no config file in the loop.
 */
function singleRuleResolver(rule: RuleFactory) {
  return {
    resolveRule: () => Promise.resolve(rule),
    resolveConfig: () => {
      throw new Error('example models lint a single rule, not a shared config');
    },
  };
}

/**
 * Lints `test/fixtures/rules/<ruleName>/<kind>.bpmn` through that rule alone and returns the ids it
 * reported.
 */
export async function reportedIds(ruleName: string, kind: 'valid' | 'invalid'): Promise<string[]> {
  const rule = RULES[ruleName];
  if (!rule) {
    throw new Error(`unknown rule <${ruleName}>`);
  }

  const xml = readFileSync(`${EXAMPLES_DIR}/${ruleName}/${kind}.bpmn`, 'utf8');
  const { root } = await createModdle(xml);

  const linter = new Linter({ resolver: singleRuleResolver(rule) });
  const results = await linter.lint(root, { rules: { [ruleName]: 'error' } });

  return (results[ruleName] || []).map((report) => report.id);
}

/** A single finding as bpmnlint's `Linter` reports it. */
export interface Finding {
  id: string;
  message: string;
}

/**
 * Lints `test/fixtures/rules/<ruleName>/<kind>.bpmn` through the plugin's strictest engine-agnostic
 * bar — `bpmnlint:recommended` + `plugin:@miragon/rules/all`, driven by the real bundled resolver —
 * and returns every finding grouped by the rule that raised it. The key is the rule name exactly as
 * bpmnlint reports it: bare (e.g. `label-required`) for the structural base, prefixed
 * (`@miragon/rules/<rule>`) for a Miragon rule.
 *
 * This is what keeps the doc fixtures honest beyond the single rule each one illustrates: a `valid`
 * model must come back empty, and an `invalid` model must trip only the rule its folder is named
 * after.
 */
export async function fullConfigReports(
  ruleName: string,
  kind: 'valid' | 'invalid',
): Promise<Record<string, Finding[]>> {
  const xml = readFileSync(`${EXAMPLES_DIR}/${ruleName}/${kind}.bpmn`, 'utf8');
  const { root } = await createModdle(xml);

  const linter = new Linter({ resolver: createBundledResolver() });
  return linter.lint(root, all) as Promise<Record<string, Finding[]>>;
}
