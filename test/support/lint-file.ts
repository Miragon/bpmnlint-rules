import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import Linter from 'bpmnlint/lib/linter';
import { createModdle } from 'bpmnlint/lib/testers/helper';

import type { RuleFactory } from '../../src/lib/moddle';

import noGeneratedIds from '../../src/rules/miragon/no-generated-ids';
import elementIdNaming from '../../src/rules/miragon/element-id-naming';
import flowThroughElement from '../../src/rules/miragon/flow-through-element';
import flowConnectionSide from '../../src/rules/miragon/flow-connection-side';

const RULES: Record<string, RuleFactory> = {
  'no-generated-ids': noGeneratedIds,
  'element-id-naming': elementIdNaming,
  'flow-through-element': flowThroughElement,
  'flow-connection-side': flowConnectionSide,
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
