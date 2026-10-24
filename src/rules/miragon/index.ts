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
import type {
  BpmnlintConfig,
  Engine,
  ResolverEntries,
  RuleSet,
  RuleSeverity,
} from '../../lib/bpmnlint-config';
import type { RuleFactory } from '../../lib/moddle';

import boundaryEventMarkerOverlap from './boundary-event-marker-overlap';
import asyncContinuations from './async-continuations';
import elementIdNaming from './element-id-naming';
import exclusiveGatewayMarkerVisible from './exclusive-gateway-marker-visible';
import flowConnectionSide from './flow-connection-side';
import flowCrossing from './flow-crossing';
import flowOrthogonal from './flow-orthogonal';
import flowTargetAlignment from './flow-target-alignment';
import flowThroughElement from './flow-through-element';
import messageNameNaming from './message-name-naming';
import noGeneratedIds from './no-generated-ids';
import workerTopicNaming from './worker-topic-naming';

/** The expanded plugin package name — the prefix every resolver cache key uses. */
export const MIRAGON_PLUGIN = '@miragon/bpmnlint-plugin-rules';

/** The short plugin name a `.bpmnlintrc` writes (`@miragon/rules/<rule>`, `plugin:@miragon/rules/<config>`). */
export const MIRAGON_NAME = '@miragon/rules';

const ruleFactoriesByName = {
  [noGeneratedIds.ruleName]: noGeneratedIds,
  [elementIdNaming.ruleName]: elementIdNaming,
  [workerTopicNaming.ruleName]: workerTopicNaming,
  [messageNameNaming.ruleName]: messageNameNaming,
  [flowThroughElement.ruleName]: flowThroughElement,
  [flowConnectionSide.ruleName]: flowConnectionSide,
  [flowTargetAlignment.ruleName]: flowTargetAlignment,
  [flowCrossing.ruleName]: flowCrossing,
  [flowOrthogonal.ruleName]: flowOrthogonal,
  [boundaryEventMarkerOverlap.ruleName]: boundaryEventMarkerOverlap,
  [exclusiveGatewayMarkerVisible.ruleName]: exclusiveGatewayMarkerVisible,
  [asyncContinuations.ruleName]: asyncContinuations,
};

/** The short (unprefixed) name of a rule this plugin ships, as each rule file declares it. */
export type MiragonRuleName = keyof typeof ruleFactoriesByName;

/**
 * What a rule is, as far as the opinion layers care — the one fact each rule declares (`kind`)
 * from which its severity in every layer follows (see {@link SEVERITY_BY_KIND}):
 *  - `layout-hint` — a non-blocking layout hint, safe on hand-drawn diagrams;
 *  - `misdrawn` — a drawing defect, not merely untidy, so it blocks even while modeling;
 *  - `convention` — an execution-only convention a modeler shouldn't be blocked on;
 *  - `scheme` — needs a project-chosen scheme before it can say anything useful;
 *  - `engine-specific` — applies to one engine only (the rule also sets `targetEngine`).
 */
type MiragonRuleKind = 'layout-hint' | 'misdrawn' | 'convention' | 'scheme' | 'engine-specific';

/** A Miragon rule factory: every rule declares its `kind`, engine-specific ones their `targetEngine`. */
type MiragonRuleFactory = RuleFactory & { kind: MiragonRuleKind; targetEngine?: Engine };

/** The Miragon opinion layers, keyed by the config name they are exposed under. */
type MiragonLayerName = 'recommended-for-modeling' | 'recommended-for-automation' | 'all';

/**
 * The severity policy: per rule kind, its severity in each layer. Only `all` blocks; the two
 * `recommended-for-*` layers stay non-blocking bar `misdrawn` in the modeling layer.
 */
const SEVERITY_BY_KIND: Record<MiragonRuleKind, Record<MiragonLayerName, RuleSeverity>> = {
  'layout-hint': {
    'recommended-for-modeling': 'warn',
    'recommended-for-automation': 'warn',
    all: 'error',
  },
  misdrawn: {
    'recommended-for-modeling': 'error',
    'recommended-for-automation': 'warn',
    all: 'error',
  },
  convention: {
    'recommended-for-modeling': 'off',
    'recommended-for-automation': 'warn',
    all: 'error',
  },
  scheme: { 'recommended-for-modeling': 'off', 'recommended-for-automation': 'off', all: 'error' },
  'engine-specific': {
    'recommended-for-modeling': 'off',
    'recommended-for-automation': 'off',
    all: 'error',
  },
};

/** The rule factories this plugin ships, keyed by their short (unprefixed) name. */
export const miragonRuleFactories: Record<string, MiragonRuleFactory> = ruleFactoriesByName;

function miragonLayer(layerName: MiragonLayerName): RuleSet {
  return Object.fromEntries(
    Object.entries(miragonRuleFactories).map(([name, factory]) => [
      `${MIRAGON_NAME}/${name}`,
      SEVERITY_BY_KIND[factory.kind][layerName],
    ]),
  );
}

/**
 * The Miragon opinion layer for **modeling**, exposed as
 * `plugin:@miragon/rules/recommended-for-modeling`.
 *
 * Tuned for hand-drawn, human-facing diagrams: bpmnlint's own `standard-size` at `warn` (a superset
 * of what a custom sizing rule would do, kept in sync with bpmn-js upstream), layout hints at `warn`,
 * misdrawn elements at `error`, and everything execution-only `off`.
 */
export const miragonRecommendedForModeling: BpmnlintConfig = {
  rules: { 'bpmnlint/standard-size': 'warn', ...miragonLayer('recommended-for-modeling') },
};

/**
 * The Miragon opinion layer for **automation**, exposed as
 * `plugin:@miragon/rules/recommended-for-automation`.
 *
 * Tuned for executable processes: every engine-agnostic Miragon rule on, but as a non-blocking
 * `warn`, alongside `standard-size` at `warn`. Engine-specific and scheme rules stay `off` — opt-in
 * via `all` or a consumer's own config.
 */
export const miragonRecommendedForAutomation: BpmnlintConfig = {
  rules: { 'bpmnlint/standard-size': 'warn', ...miragonLayer('recommended-for-automation') },
};

/** Every Miragon rule at `error` — the opt-in `plugin:@miragon/rules/all`. */
export const miragonAll: BpmnlintConfig = { rules: miragonLayer('all') };

/** The Miragon opinion layers, keyed by the config name they are exposed under. */
export const miragonLayers: Record<MiragonLayerName, BpmnlintConfig> = {
  'recommended-for-modeling': miragonRecommendedForModeling,
  'recommended-for-automation': miragonRecommendedForAutomation,
  all: miragonAll,
};

/** This folder's fragment of the bundled StaticResolver cache. */
export const resolverEntries: ResolverEntries = {
  ...Object.fromEntries(
    Object.entries(miragonLayers).map(([layerName, layer]) => [
      `config:${MIRAGON_PLUGIN}/${layerName}`,
      layer,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(miragonRuleFactories).map(([name, factory]) => [
      `rule:${MIRAGON_PLUGIN}/${name}`,
      factory,
    ]),
  ),
};

export {
  asyncContinuations,
  boundaryEventMarkerOverlap,
  elementIdNaming,
  exclusiveGatewayMarkerVisible,
  flowConnectionSide,
  flowCrossing,
  flowOrthogonal,
  flowTargetAlignment,
  flowThroughElement,
  messageNameNaming,
  noGeneratedIds,
  workerTopicNaming,
};
