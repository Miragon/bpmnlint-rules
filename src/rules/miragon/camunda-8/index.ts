/**
 * The Miragon rules for Camunda 8: the engine checks camunda-compat's `camunda-cloud-8-*`
 * configs leave out. Each one declares `targetEngine: 'c8'` and the `impact` that sets its
 * severity in the `plugin:@miragon/rules/camunda-8` engine layer.
 */
import type { BpmnlintConfig, ResolverEntries } from '../../../lib/bpmnlint-config';
import { MIRAGON_NAME } from '../../../lib/plugin-names';
import { SeverityPolicy } from '../../../lib/SeverityPolicy';
import type { DeclaredRuleFactory } from '../../../lib/utils/defineRule';
import { miragonResolverEntries } from '../../../lib/utils/resolverEntries';

export const camunda8RuleFactories = {};

/** The Camunda 8 engine layer, exposed as `plugin:@miragon/rules/camunda-8`. */
export const camunda8Layer: BpmnlintConfig = {
  rules: new SeverityPolicy(
    MIRAGON_NAME,
    camunda8RuleFactories as Record<string, DeclaredRuleFactory>,
  ).engineRuleSetFor('c8'),
};

/** This engine's fragment of the StaticResolver cache: its layer and its rules. */
export const resolverEntries: ResolverEntries = miragonResolverEntries(
  { 'camunda-8': camunda8Layer },
  camunda8RuleFactories,
);
