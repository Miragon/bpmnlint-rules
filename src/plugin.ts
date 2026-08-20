/**
 * The bpmnlint-plugin contract: `rules` + `configs` on the package root, so a workspace can use it
 * the classic way — install it, add `plugin:@miragon/rules/recommended` to `.bpmnlintrc`, run
 * `bpmnlint`. bpmnlint's `NodeResolver` reads `require('@miragon/bpmnlint-plugin-rules').rules[name]`
 * (a require-path string) and `.configs[name]`.
 *
 * `rules` therefore maps each short rule name to a *path string* (not the factory) — pointed at the
 * CJS build so `require` resolves inside this `"type": "module"` package, and emitted by tsup's
 * `cjsInterop` so each file's `module.exports` IS the bare factory bpmnlint calls. The map is
 * derived from the same rule set the resolver uses, so the two never drift.
 *
 * Programmatic consumers don't use this — they use `createBundledResolver()` (self-contained, also
 * bundles the structural + Camunda layers) or the exported `miragonRuleFactories`.
 */
import type { BpmnlintConfig } from './lib/bpmnlint-config';

import { miragonAll, miragonRecommended, miragonRuleFactories } from './rules/miragon';

export const rules: Record<string, string> = Object.fromEntries(
  Object.keys(miragonRuleFactories).map((name) => [name, `./rules/miragon/${name}.cjs`]),
);

export const configs: Record<string, BpmnlintConfig> = {
  recommended: miragonRecommended,
  all: miragonAll,
};
