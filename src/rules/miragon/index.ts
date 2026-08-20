/**
 * The Miragon rule-set — the only folder whose rule source we author.
 *
 * It bundles the DI/naming/visual rules ported from `bpmnlint-plugin-agentic`, plus the thin,
 * non-engine Miragon opinion layer exposed as `plugin:@miragon/rules/recommended`.
 *
 * The npm package is `@miragon/bpmnlint-plugin-rules`; in a `.bpmnlintrc` bpmnlint expands the short
 * form `@miragon/rules` to it. So config rule references use the short {@link MIRAGON_NAME}
 * (`@miragon/rules`), while the resolver cache keys use the expanded {@link MIRAGON_PLUGIN}
 * (`@miragon/bpmnlint-plugin-rules`) that bpmnlint normalises to before calling the resolver.
 */
import type { BpmnlintConfig, ResolverEntries, RuleSet } from '../../lib/bpmnlint-config';
import type { RuleFactory } from '../../lib/moddle';

import elementIdNaming from './element-id-naming';
import flowConnectionSide from './flow-connection-side';
import flowThroughElement from './flow-through-element';
import noGeneratedIds from './no-generated-ids';

/** The expanded plugin package name — the prefix every resolver cache key uses. */
export const MIRAGON_PLUGIN = '@miragon/bpmnlint-plugin-rules';

/** The short plugin name a `.bpmnlintrc` writes (`@miragon/rules/<rule>`, `plugin:@miragon/rules/<config>`). */
export const MIRAGON_NAME = '@miragon/rules';

/** The rule factories this plugin ships, keyed by their short (unprefixed) name. */
export const miragonRuleFactories: Record<string, RuleFactory> = {
  'no-generated-ids': noGeneratedIds,
  'element-id-naming': elementIdNaming,
  'flow-through-element': flowThroughElement,
  'flow-connection-side': flowConnectionSide,
};

/**
 * The visual/layout subset — a category *tag* over the same folder, not a separate one. Handy for
 * a consumer that wants only the geometry rules on. (Element sizing is covered by bpmnlint's own
 * `standard-size`, which the Miragon layer already enables — see {@link miragonRecommended}.)
 */
export const visualRules: RuleSet = {
  [`${MIRAGON_NAME}/flow-through-element`]: 'error',
  [`${MIRAGON_NAME}/flow-connection-side`]: 'error',
};

/** The naming/id subset. */
export const namingRules: RuleSet = {
  [`${MIRAGON_NAME}/no-generated-ids`]: 'error',
  [`${MIRAGON_NAME}/element-id-naming`]: 'error',
};

/**
 * The Miragon opinion layer exposed as `plugin:@miragon/rules/recommended`.
 *
 * It enables bpmnlint's own `standard-size` at `warn` and lists every Miragon rule *present but
 * `off`*, so adopting the layer changes nothing until a consumer opts a rule in.
 */
export const miragonRecommended: BpmnlintConfig = {
  rules: {
    // Element sizing is bpmnlint's own `standard-size` (a superset of what a custom rule would do,
    // kept in sync with bpmn-js upstream) — enabled here at `warn`.
    'bpmnlint/standard-size': 'warn',
    [`${MIRAGON_NAME}/no-generated-ids`]: 'off',
    [`${MIRAGON_NAME}/element-id-naming`]: 'off',
    [`${MIRAGON_NAME}/flow-through-element`]: 'off',
    [`${MIRAGON_NAME}/flow-connection-side`]: 'off',
  },
};

/** Every Miragon rule at `error` — the opt-in `plugin:@miragon/rules/all`. */
export const miragonAll: BpmnlintConfig = {
  rules: {
    [`${MIRAGON_NAME}/no-generated-ids`]: 'error',
    [`${MIRAGON_NAME}/element-id-naming`]: 'error',
    [`${MIRAGON_NAME}/flow-through-element`]: 'error',
    [`${MIRAGON_NAME}/flow-connection-side`]: 'error',
  },
};

/** This folder's fragment of the bundled StaticResolver cache. */
export const resolverEntries: ResolverEntries = {
  [`config:${MIRAGON_PLUGIN}/recommended`]: miragonRecommended,
  [`config:${MIRAGON_PLUGIN}/all`]: miragonAll,
  ...Object.fromEntries(
    Object.entries(miragonRuleFactories).map(([name, factory]) => [
      `rule:${MIRAGON_PLUGIN}/${name}`,
      factory,
    ]),
  ),
};

export { elementIdNaming, flowConnectionSide, flowThroughElement, noGeneratedIds };
