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

import c8BoundaryHost from './c8-boundary-host';
import c8EventDefinition from './c8-event-definition';
import c8LinkEvent from './c8-link-event';
import c8AdHocSubProcess from './c8-ad-hoc-sub-process';
import c8EventGateway from './c8-event-gateway';
import c8Message from './c8-message';
import c8Signal from './c8-signal';
import c8Error from './c8-error';
import c8StartEvent from './c8-start-event';
import c8FeelExpression from './c8-feel-expression';
import c8FeelCompletionCondition from './c8-feel-completion-condition';
import c8Implementation from './c8-implementation';
import c8BadValue from './c8-bad-value';
import c8Schema from './c8-schema';
import c8Listener from './c8-listener';
import c8Extension from './c8-extension';
import c8DuplicateExtension from './c8-duplicate-extension';
import c8ForeignContent from './c8-foreign-content';
import c8UnknownAttribute from './c8-unknown-attribute';
import c8MisplacedAttribute from './c8-misplaced-attribute';
import c8MisplacedExtension from './c8-misplaced-extension';

export const camunda8RuleFactories = {
  [c8BoundaryHost.ruleName]: c8BoundaryHost,
  [c8EventDefinition.ruleName]: c8EventDefinition,
  [c8LinkEvent.ruleName]: c8LinkEvent,
  [c8AdHocSubProcess.ruleName]: c8AdHocSubProcess,
  [c8EventGateway.ruleName]: c8EventGateway,
  [c8Message.ruleName]: c8Message,
  [c8Signal.ruleName]: c8Signal,
  [c8Error.ruleName]: c8Error,
  [c8StartEvent.ruleName]: c8StartEvent,
  [c8FeelExpression.ruleName]: c8FeelExpression,
  [c8FeelCompletionCondition.ruleName]: c8FeelCompletionCondition,
  [c8Implementation.ruleName]: c8Implementation,
  [c8BadValue.ruleName]: c8BadValue,
  [c8Schema.ruleName]: c8Schema,
  [c8Listener.ruleName]: c8Listener,
  [c8Extension.ruleName]: c8Extension,
  [c8DuplicateExtension.ruleName]: c8DuplicateExtension,
  [c8ForeignContent.ruleName]: c8ForeignContent,
  [c8UnknownAttribute.ruleName]: c8UnknownAttribute,
  [c8MisplacedAttribute.ruleName]: c8MisplacedAttribute,
  [c8MisplacedExtension.ruleName]: c8MisplacedExtension,
};

/**
 * The Camunda 8 engine layer, exposed as `plugin:@miragon/rules/camunda-8`. It switches
 * camunda-compat's `feel` off: `c8-feel-expression` checks the same values with the grammar
 * Camunda 8 accepts, and FEEL names and values without `=` too.
 */
export const camunda8Layer: BpmnlintConfig = {
  rules: {
    'camunda-compat/feel': 'off',
    ...new SeverityPolicy(
      MIRAGON_NAME,
      camunda8RuleFactories as Record<string, DeclaredRuleFactory>,
    ).engineRuleSetFor('c8'),
  },
};

/** This engine's fragment of the StaticResolver cache: its layer and its rules. */
export const resolverEntries: ResolverEntries = miragonResolverEntries(
  { 'camunda-8': camunda8Layer },
  camunda8RuleFactories,
);
