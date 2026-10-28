/**
 * The bpmnlint-plugin contract: `rules` + `configs` on the package root, so a workspace can use it
 * the classic way — install it, add `plugin:@miragon/rules/recommended-for-modeling` to `.bpmnlintrc`, run
 * `bpmnlint`. bpmnlint's `NodeResolver` reads `require('@miragon/bpmnlint-plugin-rules').rules[name]`
 * (a require-path string) and `.configs[name]`.
 *
 * `rules` therefore maps each short rule name to a *path string* (not the factory), an engine rule's
 * inside its `camunda-<n>/` folder. The path points at the CJS build so `require` resolves inside
 * this `"type": "module"` package, and tsup's `cjsInterop` makes each file's `module.exports` the
 * bare factory bpmnlint calls. The map is derived from the same rule set the resolver uses, so the
 * two never drift.
 *
 * Programmatic consumers don't use this — they use `createBundledResolver()` (self-contained, also
 * bundles the structural + Camunda layers) or the exported `miragonRuleFactories`.
 */
import type { BpmnlintConfig } from './lib/bpmnlint-config';

import { miragonLayers, miragonRuleFactories } from './rules/miragon';
import { camunda7RuleFactories } from './rules/miragon/camunda-7';
import { camunda8RuleFactories } from './rules/miragon/camunda-8';

const FOLDER_OF_RULE: Record<string, string> = {
  ...Object.fromEntries(Object.keys(camunda7RuleFactories).map((name) => [name, 'camunda-7/'])),
  ...Object.fromEntries(Object.keys(camunda8RuleFactories).map((name) => [name, 'camunda-8/'])),
};

export const rules: Record<string, string> = Object.fromEntries(
  Object.keys(miragonRuleFactories).map((name) => [
    name,
    `./rules/miragon/${FOLDER_OF_RULE[name] ?? ''}${name}.cjs`,
  ]),
);

export const configs: Record<string, BpmnlintConfig> = miragonLayers;
