/**
 * The Miragon rule-set — the only folder whose rule source we author.
 *
 * It bundles the DI/naming/visual rules ported from `bpmnlint-plugin-agentic`, plus the thin,
 * non-engine Miragon opinion layers exposed as `plugin:@miragon/rules/recommended-for-modeling`
 * and `plugin:@miragon/rules/recommended-for-automation`.
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
import flowTargetAlignment from './flow-target-alignment';
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
  'flow-target-alignment': flowTargetAlignment,
};

/**
 * The visual/layout subset — a category *tag* over the same folder, not a separate one. Handy for
 * a consumer that wants only the geometry rules on. (Element sizing is covered by bpmnlint's own
 * `standard-size`, which the Miragon layers already enable — see {@link miragonRecommendedForModeling}.)
 */
export const visualRules: RuleSet = {
  [`${MIRAGON_NAME}/flow-through-element`]: 'error',
  [`${MIRAGON_NAME}/flow-connection-side`]: 'error',
  [`${MIRAGON_NAME}/flow-target-alignment`]: 'error',
};

/** The naming/id subset. */
export const namingRules: RuleSet = {
  [`${MIRAGON_NAME}/no-generated-ids`]: 'error',
  [`${MIRAGON_NAME}/element-id-naming`]: 'error',
};

/**
 * The Miragon opinion layer for **modeling**, exposed as
 * `plugin:@miragon/rules/recommended-for-modeling`.
 *
 * Tuned for hand-drawn, human-facing diagrams: bpmnlint's own `standard-size` at `warn`, the layout
 * rules at `warn` (non-blocking layout hints), and the naming/id rules `off` — a modeler shouldn't
 * be blocked on id conventions that only matter once a process is wired up for execution.
 */
export const miragonRecommendedForModeling: BpmnlintConfig = {
  rules: {
    // Element sizing is bpmnlint's own `standard-size` (a superset of what a custom rule would do,
    // kept in sync with bpmn-js upstream) — enabled here at `warn`.
    'bpmnlint/standard-size': 'warn',
    [`${MIRAGON_NAME}/no-generated-ids`]: 'off',
    [`${MIRAGON_NAME}/element-id-naming`]: 'off',
    [`${MIRAGON_NAME}/flow-through-element`]: 'warn',
    [`${MIRAGON_NAME}/flow-connection-side`]: 'warn',
    [`${MIRAGON_NAME}/flow-target-alignment`]: 'warn',
  },
};

/**
 * The Miragon opinion layer for **automation**, exposed as
 * `plugin:@miragon/rules/recommended-for-automation`.
 *
 * Tuned for executable processes: every Miragon rule at `error` (clean ids and layout are load-
 * bearing once a diagram is deployed and diffed), plus `standard-size` at `warn`.
 */
export const miragonRecommendedForAutomation: BpmnlintConfig = {
  rules: {
    'bpmnlint/standard-size': 'warn',
    ...namingRules,
    ...visualRules,
  },
};

/** Every Miragon rule at `error` — the opt-in `plugin:@miragon/rules/all`. */
export const miragonAll: BpmnlintConfig = {
  rules: {
    ...namingRules,
    ...visualRules,
  },
};

/** This folder's fragment of the bundled StaticResolver cache. */
export const resolverEntries: ResolverEntries = {
  [`config:${MIRAGON_PLUGIN}/recommended-for-modeling`]: miragonRecommendedForModeling,
  [`config:${MIRAGON_PLUGIN}/recommended-for-automation`]: miragonRecommendedForAutomation,
  [`config:${MIRAGON_PLUGIN}/all`]: miragonAll,
  ...Object.fromEntries(
    Object.entries(miragonRuleFactories).map(([name, factory]) => [
      `rule:${MIRAGON_PLUGIN}/${name}`,
      factory,
    ]),
  ),
};

export {
  elementIdNaming,
  flowConnectionSide,
  flowTargetAlignment,
  flowThroughElement,
  noGeneratedIds,
};
