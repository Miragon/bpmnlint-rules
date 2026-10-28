import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C8EventPosition } from '../../../lib/engine/c8-events/C8EventPosition';
import { FlowIndex } from '../../../lib/engine/c8-events/FlowIndex';
import { SubscriptionGroups } from '../../../lib/engine/c8-events/SubscriptionGroups';
import { isBlank, isFeel } from '../../../lib/engine/c8-events/utils/c8Values';
import { EngineRule } from '../../../lib/engine/EngineRule';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports message subscriptions Camunda 8 refuses to deploy: a process start event whose message
 * name is a FEEL expression, and one message name twice among the events it subscribes to together
 * (the boundary events of an activity with a receive task itself, the targets of an event-based
 * gateway, the starts of a scope's event sub-processes, the starts of a process).
 */
class C8Message extends EngineRule {
  protected readonly engine: Engine = 'c8';
  private readonly flows = new FlowIndex();

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (!C8EventPosition.isExecutable(node)) {
      return;
    }
    if (is(node, 'bpmn:StartEvent') && is(node.$parent, 'bpmn:Process')) {
      this.checkStartName(node, reporter);
    }
    if (is(node, 'bpmn:Process') || is(node, 'bpmn:SubProcess')) {
      this.checkScope(node, reporter);
    }
  }

  private checkStartName(node: ModdleElement, reporter: Reporter): void {
    const definition = C8EventPosition.checkedDefinition(node);
    const message =
      definition && is(definition, 'bpmn:MessageEventDefinition')
        ? definition.get('messageRef')
        : undefined;
    const name = message?.get('name');
    if (!isFeel(name)) {
      return;
    }
    reportErrors(node, reporter, {
      message: `Start event ${node.id} catches the message "${name}", a FEEL expression; Camunda 8 needs a static message name on process start events and refuses the file`,
      path: ['eventDefinitions', 0, 'messageRef', 'name'],
      data: {
        type: ERROR_TYPES.EXPRESSION_NOT_ALLOWED,
        node: message,
        parentNode: node,
        property: 'name',
      },
    });
  }

  private checkScope(scope: ModdleElement, reporter: Reporter): void {
    const groups = new SubscriptionGroups(scope, this.flows);
    for (const { activity, boundaries } of groups.boundaryGroups()) {
      const waiting = is(activity, 'bpmn:ReceiveTask') ? [activity, ...boundaries] : boundaries;
      this.reportDuplicates(waiting, `on ${activity.id}`, reporter);
    }
    for (const { gateway, targets } of groups.gatewayTargets()) {
      this.reportDuplicates(targets, `after event-based gateway ${gateway.id}`, reporter);
    }
    this.reportDuplicates(
      groups.eventSubProcessStarts(),
      `in the event sub-processes of ${scope.id}`,
      reporter,
    );
    this.reportDuplicates(groups.processStarts(), `in process ${scope.id}`, reporter);
  }

  private reportDuplicates(events: ModdleElement[], where: string, reporter: Reporter): void {
    const duplicates = SubscriptionGroups.duplicates(events, (el) => this.staticNameOf(el));
    for (const { first, el, key } of duplicates) {
      reportErrors(el, reporter, {
        message: `${describeElement(el)} waits for the message "${key}" like ${describeElement(first)} ${where}; Camunda 8 refuses one message name twice there`,
        path: is(el, 'bpmn:ReceiveTask') ? ['messageRef'] : ['eventDefinitions', 0, 'messageRef'],
        data: {
          type: ERROR_TYPES.ELEMENT_PROPERTY_VALUE_DUPLICATED,
          node: el,
          parentNode: null,
          duplicatedProperty: 'name',
          duplicatedPropertyValue: key,
        },
      });
    }
  }

  /** The message name `el` waits for, unless it has none or a FEEL one. */
  private staticNameOf(el: ModdleElement): string | undefined {
    const holder = is(el, 'bpmn:ReceiveTask')
      ? el
      : C8EventPosition.onlyDefinition(el, 'bpmn:MessageEventDefinition');
    const name = holder?.get('messageRef')?.get('name');
    return isBlank(name) || isFeel(name) ? undefined : name;
  }
}

export default defineRule(
  { ruleName: 'c8-message', kind: 'engine-specific', targetEngine: 'c8', impact: 'deploy' },
  C8Message,
);
