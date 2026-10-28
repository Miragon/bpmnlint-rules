import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7FlowGraph } from '../../../lib/engine/c7-flows/C7FlowGraph';
import { C7FlowRule } from '../../../lib/engine/c7-flows/C7FlowRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports an exclusive gateway without default flow whose branches all have a condition but one:
 * Camunda 7 takes that one as the default and logs a warning.
 */
class C7ImplicitDefaultFlow extends C7FlowRule {
  protected checkRunElement(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:ExclusiveGateway') || node.default) {
      return;
    }
    const outgoing = C7FlowGraph.forElement(node).outgoing(node);
    const unconditioned = outgoing.filter((flow) => !flow.conditionExpression);
    if (outgoing.length < 2 || unconditioned.length !== 1) {
      return;
    }
    const [flow] = unconditioned;
    reportErrors(node, reporter, {
      message: `Flow ${flow.id} of exclusive gateway ${node.id} has no condition and is not the default flow; the engines take it as the default and log a warning`,
      path: ['default'],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node,
        parentNode: null,
        requiredProperty: 'default',
        sequenceFlow: flow,
      },
    });
  }
}

export default defineRule(
  {
    ruleName: 'c7-implicit-default-flow',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'practice',
  },
  C7ImplicitDefaultFlow,
);
