import { is, isAny } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7ExecutableRule } from '../../../lib/engine/c7-implementation/C7ExecutableRule';
import { CamundaAttributes } from '../../../lib/engine/c7-implementation/CamundaAttributes';
import { ImplementationHost } from '../../../lib/engine/c7-implementation/ImplementationHost';
import { isExpression, isInteger } from '../../../lib/engine/c7-implementation/utils/values';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, ReportPath, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

const DECISION_MAPPERS = ['singleEntry', 'singleResult', 'collectEntries', 'resultList'];
const JOB_PRIORITIZED = ['bpmn:Activity', 'bpmn:Gateway', 'bpmn:Event'];

/**
 * Reports a job or external task priority that is neither a number nor an expression, and a
 * `camunda:mapDecisionResult` the engines do not know: Camunda 7 refuses the file.
 */
class C7AttributeValue extends C7ExecutableRule {
  protected checkExecutable(node: ModdleElement, reporter: Reporter): void {
    if (is(node, 'bpmn:Process')) {
      this.checkPriority(node, node, [], 'jobPriority', reporter);
      this.checkPriority(node, node, [], 'taskPriority', reporter);
    }
    if (isAny(node, JOB_PRIORITIZED) && !is(node, 'bpmn:AdHocSubProcess')) {
      this.checkPriority(node, node, [], 'jobPriority', reporter);
      this.checkLoopPriority(node, reporter);
    }
    for (const host of ImplementationHost.forElement(node)) {
      if (host.isExternal) {
        this.checkPriority(host.element, node, host.path, 'taskPriority', reporter);
      }
    }
    if (is(node, 'bpmn:BusinessRuleTask')) {
      this.checkDecisionMapper(node, reporter);
    }
  }

  private checkLoopPriority(activity: ModdleElement, reporter: Reporter): void {
    const loop = activity.get('loopCharacteristics');
    if (loop && is(loop, 'bpmn:MultiInstanceLoopCharacteristics')) {
      this.checkPriority(loop, activity, ['loopCharacteristics'], 'jobPriority', reporter);
    }
  }

  /** `element` carries the priority; `reported` is the element it sits on, or the element itself. */
  private checkPriority(
    element: ModdleElement,
    reported: ModdleElement,
    path: ReportPath,
    name: string,
    reporter: Reporter,
  ): void {
    const value = new CamundaAttributes(element).defined(name);
    if (value === undefined || isInteger(value) || isExpression(value)) {
      return;
    }
    const owner = element === reported ? undefined : reported;
    reportErrors(reported, reporter, {
      message: `camunda:${name}="${value}" on ${describeElement(element, owner)} is not a number or expression; the engines refuse it`,
      path: [...path, name],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: element,
        parentNode: owner ?? null,
        property: name,
      },
    });
  }

  private checkDecisionMapper(node: ModdleElement, reporter: Reporter): void {
    const attributes = new CamundaAttributes(node);
    const mapper = attributes.defined('mapDecisionResult');
    if (
      attributes.defined('decisionRef') === undefined ||
      mapper === undefined ||
      DECISION_MAPPERS.includes(mapper)
    ) {
      return;
    }
    reportErrors(node, reporter, {
      message: `camunda:mapDecisionResult="${mapper}" on ${describeElement(node)} is not one of ${DECISION_MAPPERS.join(', ')}; the engines refuse the file`,
      path: ['mapDecisionResult'],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node,
        parentNode: null,
        property: 'mapDecisionResult',
      },
    });
  }
}

export default defineRule(
  { ruleName: 'c7-attribute-value', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7AttributeValue,
);
