import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7FlowGraph } from '../../../lib/engine/c7-flows/C7FlowGraph';
import { C7FlowRule } from '../../../lib/engine/c7-flows/C7FlowRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports an exclusive gateway Camunda 7 refuses to deploy: no outgoing flow, a single outgoing
 * flow with a condition, a default flow with a condition, or outgoing flows without condition
 * next to a default flow (or more than one of them).
 */
class C7ExclusiveGateway extends C7FlowRule {
  protected checkRunElement(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:ExclusiveGateway')) {
      return;
    }
    const outgoing = C7FlowGraph.forElement(node).outgoing(node);
    if (!outgoing.length) {
      reportErrors(node, reporter, {
        message: `Exclusive gateway ${node.id} has no outgoing flow; the engines refuse the file`,
        path: ['outgoing'],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node,
          parentNode: null,
          requiredProperty: 'outgoing',
        },
      });
      return;
    }
    if (outgoing.length === 1) {
      this.checkSingleFlow(node, reporter, outgoing[0]);
      return;
    }
    this.checkBranches(node, reporter, outgoing);
  }

  private checkSingleFlow(node: ModdleElement, reporter: Reporter, flow: ModdleElement): void {
    if (!flow.conditionExpression) {
      return;
    }
    if (node.default === flow) {
      this.reportConditionedDefault(node, reporter, flow);
      return;
    }
    this.reportCondition(
      node,
      reporter,
      flow,
      `Exclusive gateway ${node.id} has a single outgoing flow ${flow.id} with a condition; the engines refuse the file`,
    );
  }

  private checkBranches(node: ModdleElement, reporter: Reporter, outgoing: ModdleElement[]): void {
    const defaultFlow = node.default;
    const unconditioned: ModdleElement[] = [];
    for (const flow of outgoing) {
      if (flow === defaultFlow) {
        if (flow.conditionExpression) {
          this.reportConditionedDefault(node, reporter, flow);
        }
      } else if (!flow.conditionExpression) {
        unconditioned.push(flow);
      }
    }
    if (!defaultFlow && unconditioned.length < 2) {
      return;
    }
    const count = defaultFlow ? '' : ` (${unconditioned.length} such flows)`;
    for (const flow of unconditioned) {
      reportErrors(node, reporter, {
        message: `Flow ${flow.id} of exclusive gateway ${node.id} has no condition and is not the default flow${count}; the engines refuse the file`,
        path: null,
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: flow,
          parentNode: node,
          requiredProperty: 'conditionExpression',
        },
      });
    }
  }

  private reportConditionedDefault(
    node: ModdleElement,
    reporter: Reporter,
    flow: ModdleElement,
  ): void {
    this.reportCondition(
      node,
      reporter,
      flow,
      `Default flow ${flow.id} of exclusive gateway ${node.id} has a condition; the engines refuse the file`,
    );
  }

  /** The condition of `flow` goes: the path is null, as the flow is no property of the gateway. */
  private reportCondition(
    node: ModdleElement,
    reporter: Reporter,
    flow: ModdleElement,
    message: string,
  ): void {
    reportErrors(node, reporter, {
      message,
      path: null,
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: flow,
        parentNode: node,
        property: 'conditionExpression',
      },
    });
  }
}

export default defineRule(
  {
    ruleName: 'c7-exclusive-gateway',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'deploy',
  },
  C7ExclusiveGateway,
);
