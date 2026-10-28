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
 * Reports signal subscriptions Camunda 8 refuses to deploy: a start event whose signal name is a
 * FEEL expression, and one signal name twice among the start events of a process or the boundary
 * events of one activity.
 */
class C8Signal extends EngineRule {
  protected readonly engine: Engine = 'c8';
  private readonly flows = new FlowIndex();

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (!C8EventPosition.isExecutable(node)) {
      return;
    }
    if (is(node, 'bpmn:StartEvent')) {
      this.checkStartName(node, reporter);
    }
    if (is(node, 'bpmn:Process') || is(node, 'bpmn:SubProcess')) {
      this.checkScope(node, reporter);
    }
  }

  private checkStartName(node: ModdleElement, reporter: Reporter): void {
    const definition = C8EventPosition.checkedDefinition(node);
    const signal =
      definition && is(definition, 'bpmn:SignalEventDefinition')
        ? definition.get('signalRef')
        : undefined;
    const name = signal?.get('name');
    if (!isFeel(name)) {
      return;
    }
    reportErrors(node, reporter, {
      message: `Start event ${node.id} catches the signal "${name}", a FEEL expression; Camunda 8 needs a static signal name on start events and refuses the file`,
      path: ['eventDefinitions', 0, 'signalRef', 'name'],
      data: {
        type: ERROR_TYPES.EXPRESSION_NOT_ALLOWED,
        node: signal,
        parentNode: node,
        property: 'name',
      },
    });
  }

  private checkScope(scope: ModdleElement, reporter: Reporter): void {
    const groups = new SubscriptionGroups(scope, this.flows);
    for (const { activity, boundaries } of groups.boundaryGroups()) {
      this.reportDuplicates(boundaries, `on ${activity.id}`, reporter);
    }
    this.reportDuplicates(groups.processStarts(), `in process ${scope.id}`, reporter);
  }

  private reportDuplicates(events: ModdleElement[], where: string, reporter: Reporter): void {
    const duplicates = SubscriptionGroups.duplicates(events, (el) => this.staticNameOf(el));
    for (const { first, el, key } of duplicates) {
      reportErrors(el, reporter, {
        message: `${describeElement(el)} waits for the signal "${key}" like ${describeElement(first)} ${where}; Camunda 8 refuses one signal name twice there`,
        path: ['eventDefinitions', 0, 'signalRef'],
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

  /** The signal name `el` waits for, unless it has none or a FEEL one. */
  private staticNameOf(el: ModdleElement): string | undefined {
    const definition = C8EventPosition.onlyDefinition(el, 'bpmn:SignalEventDefinition');
    const name = definition?.get('signalRef')?.get('name');
    return isBlank(name) || isFeel(name) ? undefined : name;
  }
}

export default defineRule(
  { ruleName: 'c8-signal', kind: 'engine-specific', targetEngine: 'c8', impact: 'deploy' },
  C8Signal,
);
