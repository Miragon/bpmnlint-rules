import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import Linter from 'bpmnlint/lib/linter';
import { createModdle } from 'bpmnlint/lib/testers/helper';
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json';
import zeebeModdle from 'zeebe-bpmn-moddle/resources/zeebe.json';

import type { RuleFactory } from '../../src/lib/moddle';

import { EngineConfig } from '../../src/config/EngineConfig';
import { all } from '../../src/presets/all';
import { BundledResolver } from '../../src/resolver/BundledResolver';
import { miragonRuleFactories } from '../../src/rules/miragon';

const EXAMPLES_DIR = fileURLToPath(new URL('../fixtures/rules', import.meta.url));

const ENGINE_MODDLE = { c7: { camunda: camundaModdle }, c8: { zeebe: zeebeModdle } };
const ENGINE_NAMESPACES = {
  c7: 'http://camunda.org/schema/1.0/bpmn',
  c8: 'http://camunda.org/schema/zeebe/1.0',
};

/**
 * Parses a rule's example model with the moddle extension of the engine it declares, as a modeler
 * does: an engine rule only reads typed `camunda:` / `zeebe:` properties.
 */
async function parseExample(ruleName: string, kind: 'valid' | 'invalid') {
  const xml = readFileSync(`${EXAMPLES_DIR}/${ruleName}/${kind}.bpmn`, 'utf8');
  const declared = (Object.keys(ENGINE_NAMESPACES) as Array<keyof typeof ENGINE_NAMESPACES>).filter(
    (engine) => xml.includes(`"${ENGINE_NAMESPACES[engine]}"`),
  );
  const engine =
    miragonRuleFactories[ruleName]?.targetEngine ??
    (declared.length === 1 ? declared[0] : undefined);
  return createModdle(xml, engine ? ENGINE_MODDLE[engine] : undefined);
}

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
  const rule = miragonRuleFactories[ruleName];
  if (!rule) {
    throw new Error(`unknown rule <${ruleName}>`);
  }

  const { root } = await parseExample(ruleName, kind);

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
 * after. An engine rule's models are also linted against its engine layers (camunda-compat's latest
 * config and `plugin:@miragon/rules/camunda-<n>`): a valid model must deploy.
 */
export async function fullConfigReports(
  ruleName: string,
  kind: 'valid' | 'invalid',
): Promise<Record<string, Finding[]>> {
  const { root } = await parseExample(ruleName, kind);
  const engine = miragonRuleFactories[ruleName]?.targetEngine;
  const config = engine
    ? { extends: [...all.extends!, ...EngineConfig.engineLintConfig(engine).extends!] }
    : all;

  const linter = new Linter({ resolver: BundledResolver.create() });
  return linter.lint(root, config) as Promise<Record<string, Finding[]>>;
}
