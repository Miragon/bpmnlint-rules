/**
 * The Miragon rules for Camunda 7: the engine checks camunda-compat's `camunda-platform-7-*`
 * configs leave out. Each one declares `targetEngine: 'c7'` and the `impact` that sets its
 * severity in the `plugin:@miragon/rules/camunda-7` engine layer.
 */
import type { BpmnlintConfig, ResolverEntries } from '../../../lib/bpmnlint-config';
import { MIRAGON_NAME } from '../../../lib/plugin-names';
import { SeverityPolicy } from '../../../lib/SeverityPolicy';
import type { DeclaredRuleFactory } from '../../../lib/utils/defineRule';
import { miragonResolverEntries } from '../../../lib/utils/resolverEntries';

export const camunda7RuleFactories = {};

/** The Camunda 7 engine layer, exposed as `plugin:@miragon/rules/camunda-7`. */
export const camunda7Layer: BpmnlintConfig = {
  rules: new SeverityPolicy(
    MIRAGON_NAME,
    camunda7RuleFactories as Record<string, DeclaredRuleFactory>,
  ).engineRuleSetFor('c7'),
};

/** This engine's fragment of the StaticResolver cache: its layer and its rules. */
export const resolverEntries: ResolverEntries = miragonResolverEntries(
  { 'camunda-7': camunda7Layer },
  camunda7RuleFactories,
);
