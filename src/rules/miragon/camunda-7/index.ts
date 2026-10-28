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

import c7Schema from './c7-schema';
import c7DefinitionsExtension from './c7-definitions-extension';
import c7EventGateway from './c7-event-gateway';
import c7ExclusiveGateway from './c7-exclusive-gateway';
import c7ImplicitDefaultFlow from './c7-implicit-default-flow';
import c7ComplexGateway from './c7-complex-gateway';
import c7AdHocSubProcess from './c7-ad-hoc-sub-process';
import c7EmptyCondition from './c7-empty-condition';
import c7Implementation from './c7-implementation';
import c7HistoryTimeToLive from './c7-history-time-to-live';
import c7AttributeValue from './c7-attribute-value';
import c7MessageImplementation from './c7-message-implementation';
import c7ExternalTopic from './c7-external-topic';
import c7BadValue from './c7-bad-value';
import c7ResultVariable from './c7-result-variable';
import c7BindingVersion from './c7-binding-version';
import c7CalledElement from './c7-called-element';
import c7Form from './c7-form';
import c7MultiInstance from './c7-multi-instance';
import c7Script from './c7-script';
import c7BoundaryHost from './c7-boundary-host';
import c7EventDefinition from './c7-event-definition';
import c7LinkEvent from './c7-link-event';
import c7MultipleEventDefinitions from './c7-multiple-event-definitions';
import c7Message from './c7-message';
import c7Signal from './c7-signal';
import c7Error from './c7-error';
import c7Escalation from './c7-escalation';
import c7StartEvent from './c7-start-event';
import c7TransactionStart from './c7-transaction-start';
import c7Extension from './c7-extension';
import c7Listener from './c7-listener';
import c7InputOutput from './c7-input-output';
import c7DuplicateExtension from './c7-duplicate-extension';
import c7AsyncDuplicateExtension from './c7-async-duplicate-extension';
import c7ForeignContent from './c7-foreign-content';
import c7UnknownAttribute from './c7-unknown-attribute';
import c7MisplacedAttribute from './c7-misplaced-attribute';
import c7MisplacedExtension from './c7-misplaced-extension';
import c7DanglingReference from './c7-dangling-reference';

export const camunda7RuleFactories = {
  [c7Schema.ruleName]: c7Schema,
  [c7DefinitionsExtension.ruleName]: c7DefinitionsExtension,
  [c7EventGateway.ruleName]: c7EventGateway,
  [c7ExclusiveGateway.ruleName]: c7ExclusiveGateway,
  [c7ImplicitDefaultFlow.ruleName]: c7ImplicitDefaultFlow,
  [c7ComplexGateway.ruleName]: c7ComplexGateway,
  [c7AdHocSubProcess.ruleName]: c7AdHocSubProcess,
  [c7EmptyCondition.ruleName]: c7EmptyCondition,
  [c7Implementation.ruleName]: c7Implementation,
  [c7HistoryTimeToLive.ruleName]: c7HistoryTimeToLive,
  [c7AttributeValue.ruleName]: c7AttributeValue,
  [c7MessageImplementation.ruleName]: c7MessageImplementation,
  [c7ExternalTopic.ruleName]: c7ExternalTopic,
  [c7BadValue.ruleName]: c7BadValue,
  [c7ResultVariable.ruleName]: c7ResultVariable,
  [c7BindingVersion.ruleName]: c7BindingVersion,
  [c7CalledElement.ruleName]: c7CalledElement,
  [c7Form.ruleName]: c7Form,
  [c7MultiInstance.ruleName]: c7MultiInstance,
  [c7Script.ruleName]: c7Script,
  [c7BoundaryHost.ruleName]: c7BoundaryHost,
  [c7EventDefinition.ruleName]: c7EventDefinition,
  [c7LinkEvent.ruleName]: c7LinkEvent,
  [c7MultipleEventDefinitions.ruleName]: c7MultipleEventDefinitions,
  [c7Message.ruleName]: c7Message,
  [c7Signal.ruleName]: c7Signal,
  [c7Error.ruleName]: c7Error,
  [c7Escalation.ruleName]: c7Escalation,
  [c7StartEvent.ruleName]: c7StartEvent,
  [c7TransactionStart.ruleName]: c7TransactionStart,
  [c7Extension.ruleName]: c7Extension,
  [c7Listener.ruleName]: c7Listener,
  [c7InputOutput.ruleName]: c7InputOutput,
  [c7DuplicateExtension.ruleName]: c7DuplicateExtension,
  [c7AsyncDuplicateExtension.ruleName]: c7AsyncDuplicateExtension,
  [c7ForeignContent.ruleName]: c7ForeignContent,
  [c7UnknownAttribute.ruleName]: c7UnknownAttribute,
  [c7MisplacedAttribute.ruleName]: c7MisplacedAttribute,
  [c7MisplacedExtension.ruleName]: c7MisplacedExtension,
  [c7DanglingReference.ruleName]: c7DanglingReference,
};

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
