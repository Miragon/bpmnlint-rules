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
import type { BpmnlintConfig, ResolverEntries } from '../../lib/bpmnlint-config';
import { MIRAGON_NAME, MIRAGON_PLUGIN } from '../../lib/plugin-names';
import { SeverityPolicy } from '../../lib/SeverityPolicy';
import type { MiragonLayerName } from '../../lib/SeverityPolicy';
import type { DeclaredRuleFactory } from '../../lib/utils/defineRule';
import { miragonResolverEntries } from '../../lib/utils/resolverEntries';

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
import { camunda7Layer, camunda7RuleFactories } from './camunda-7';
import { camunda8Layer, camunda8RuleFactories } from './camunda-8';

export { MIRAGON_NAME, MIRAGON_PLUGIN };

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
  ...camunda7RuleFactories,
  ...camunda8RuleFactories,
};

/** The short (unprefixed) name of a rule this plugin ships, as each rule file declares it. */
export type MiragonRuleName = keyof typeof ruleFactoriesByName;

/** The rule factories this plugin ships, keyed by their short (unprefixed) name. */
export const miragonRuleFactories: Record<string, DeclaredRuleFactory> = ruleFactoriesByName;

const severityPolicy = new SeverityPolicy(MIRAGON_NAME, miragonRuleFactories);

/**
 * The Miragon opinion layer for **modeling**, exposed as
 * `plugin:@miragon/rules/recommended-for-modeling`.
 *
 * Tuned for hand-drawn, human-facing diagrams: bpmnlint's own `standard-size` at `warn` (a superset
 * of what a custom sizing rule would do, kept in sync with bpmn-js upstream), layout hints at `warn`,
 * misdrawn elements at `error`, and everything execution-only `off`.
 */
export const miragonRecommendedForModeling: BpmnlintConfig = {
  rules: {
    'bpmnlint/standard-size': 'warn',
    ...severityPolicy.ruleSetFor('recommended-for-modeling'),
  },
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
  rules: {
    'bpmnlint/standard-size': 'warn',
    ...severityPolicy.ruleSetFor('recommended-for-automation'),
  },
};

/** Every Miragon rule at `error` — the opt-in `plugin:@miragon/rules/all`. */
export const miragonAll: BpmnlintConfig = { rules: severityPolicy.ruleSetFor('all') };

/** The engine layers, `plugin:@miragon/rules/camunda-7` and `plugin:@miragon/rules/camunda-8`. */
export const miragonEngineLayers = { 'camunda-7': camunda7Layer, 'camunda-8': camunda8Layer };

export const miragonLayers: Record<
  MiragonLayerName | keyof typeof miragonEngineLayers,
  BpmnlintConfig
> = {
  'recommended-for-modeling': miragonRecommendedForModeling,
  'recommended-for-automation': miragonRecommendedForAutomation,
  all: miragonAll,
  ...miragonEngineLayers,
};

/** This folder's fragment of the bundled StaticResolver cache. */
export const resolverEntries: ResolverEntries = miragonResolverEntries(
  miragonLayers,
  miragonRuleFactories,
);

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
