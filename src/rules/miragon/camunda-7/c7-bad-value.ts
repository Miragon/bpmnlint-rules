import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { ActedEventDefinitions } from '../../../lib/engine/c7-implementation/ActedEventDefinitions';
import { C7ExecutableRule } from '../../../lib/engine/c7-implementation/C7ExecutableRule';
import { CamundaAttributes } from '../../../lib/engine/c7-implementation/CamundaAttributes';
import { ImplementationHost } from '../../../lib/engine/c7-implementation/ImplementationHost';
import { ReferenceBinding } from '../../../lib/engine/c7-implementation/ReferenceBinding';
import { isExpression, isInteger } from '../../../lib/engine/c7-implementation/utils/values';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

const VARIABLE_EVENTS = ['create', 'update', 'delete'];

/**
 * Reports a value Camunda 7 deploys but cannot use when the process runs: an empty external task
 * topic or called element, an unknown binding, a user task priority that is not a number or
 * expression, or a variable event that never triggers a condition.
 */
class C7BadValue extends C7ExecutableRule {
  protected checkExecutable(node: ModdleElement, reporter: Reporter): void {
    this.checkTopics(node, reporter);
    if (is(node, 'bpmn:CallActivity')) {
      this.checkCalledElement(node, reporter);
    }
    this.checkBindings(node, reporter);
    if (is(node, 'bpmn:UserTask')) {
      this.checkPriority(node, reporter);
    }
    if (is(node, 'bpmn:Event')) {
      this.checkVariableEvents(node, reporter);
    }
  }

  private checkTopics(node: ModdleElement, reporter: Reporter): void {
    for (const host of ImplementationHost.forElement(node)) {
      if (!host.isExternal || host.attributes.defined('topic') !== '') {
        continue;
      }
      reportErrors(node, reporter, {
        message: `${host.label} is an external task with an empty camunda:topic; no worker can fetch it`,
        path: host.pathTo('topic'),
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_REQUIRED,
          node: host.element,
          parentNode: host.parentNode,
          property: 'topic',
        },
      });
    }
  }

  private checkCalledElement(node: ModdleElement, reporter: Reporter): void {
    if (
      node.get('calledElement') !== '' ||
      new CamundaAttributes(node).defined('caseRef') !== undefined
    ) {
      return;
    }
    reportErrors(node, reporter, {
      message: `Call activity ${node.id} has an empty calledElement; it fails when it runs`,
      path: ['calledElement'],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_REQUIRED,
        node,
        parentNode: null,
        property: 'calledElement',
      },
    });
  }

  private checkBindings(node: ModdleElement, reporter: Reporter): void {
    for (const binding of ReferenceBinding.forElement(node)) {
      if (binding.problem !== 'value') {
        continue;
      }
      reportErrors(node, reporter, {
        message: `camunda:${binding.binding}="${binding.value}" on ${describeElement(node)} is not one of ${binding.allowed.join(', ')}; the engines accept the file but cannot resolve the reference as intended`,
        path: [binding.binding],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
          node,
          parentNode: null,
          property: binding.binding,
        },
      });
    }
  }

  private checkPriority(node: ModdleElement, reporter: Reporter): void {
    const priority = new CamundaAttributes(node).defined('priority');
    if (priority === undefined || isInteger(priority) || isExpression(priority)) {
      return;
    }
    reportErrors(node, reporter, {
      message: `camunda:priority="${priority}" on ${describeElement(node)} is not a number or expression; creating the task fails`,
      path: ['priority'],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node,
        parentNode: null,
        property: 'priority',
      },
    });
  }

  private checkVariableEvents(node: ModdleElement, reporter: Reporter): void {
    const conditions = new ActedEventDefinitions(node).ofType('bpmn:ConditionalEventDefinition');
    for (const { definition, index } of conditions) {
      const events = new CamundaAttributes(definition).defined('variableEvents');
      const unknown = (events ?? '')
        .split(',')
        .map((eventName) => eventName.trim())
        .filter((eventName) => eventName && !VARIABLE_EVENTS.includes(eventName));
      if (!unknown.length) {
        continue;
      }
      reportErrors(node, reporter, {
        message: `camunda:variableEvents="${events}" of ${describeElement(node)} lists ${unknown.join(', ')}; only ${VARIABLE_EVENTS.join(', ')} trigger the condition`,
        path: ['eventDefinitions', index, 'variableEvents'],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
          node: definition,
          parentNode: node,
          property: 'variableEvents',
        },
      });
    }
  }
}

export default defineRule(
  { ruleName: 'c7-bad-value', kind: 'engine-specific', targetEngine: 'c7', impact: 'runtime' },
  C7BadValue,
);
