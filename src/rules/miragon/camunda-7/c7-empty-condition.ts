import { is, isAny } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7ActedOnDefinitions } from '../../../lib/engine/c7-flows/C7ActedOnDefinitions';
import { C7FlowRule } from '../../../lib/engine/c7-flows/C7FlowRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports a condition without expression and without `camunda:resource` script, on a sequence flow
 * the engines evaluate or on a conditional event: Camunda 7 deploys it, and evaluating it fails.
 */
class C7EmptyCondition extends C7FlowRule {
  protected checkRunElement(node: ModdleElement, reporter: Reporter): void {
    if (is(node, 'bpmn:SequenceFlow')) {
      this.checkFlow(node, reporter);
    } else if (is(node, 'bpmn:Event')) {
      this.checkEvent(node, reporter);
    }
  }

  private checkFlow(flow: ModdleElement, reporter: Reporter): void {
    const condition = flow.conditionExpression;
    if (!condition || !this.isEmpty(condition) || this.isIgnored(flow)) {
      return;
    }
    reportErrors(flow, reporter, {
      message: `Sequence flow ${flow.id} has an empty condition (no expression and no camunda:resource): it deploys, but the engines fail when they evaluate it`,
      path: ['conditionExpression'],
      data: {
        type: ERROR_TYPES.EXPRESSION_REQUIRED,
        node: condition,
        parentNode: flow,
        property: 'conditionExpression',
      },
    });
  }

  private checkEvent(event: ModdleElement, reporter: Reporter): void {
    const definitions = new C7ActedOnDefinitions(event);
    for (const definition of definitions.list()) {
      const condition = is(definition, 'bpmn:ConditionalEventDefinition')
        ? definition.condition
        : undefined;
      if (!condition || !this.isEmpty(condition)) {
        continue;
      }
      reportErrors(event, reporter, {
        message: `Conditional event ${event.id} has an empty condition (no expression and no camunda:resource): it deploys, but evaluating it fails when the process runs`,
        path: ['eventDefinitions', definitions.all().indexOf(definition), 'condition'],
        data: {
          type: ERROR_TYPES.EXPRESSION_REQUIRED,
          node: condition,
          parentNode: event,
          property: 'condition',
        },
      });
    }
  }

  /** A default flow and a flow out of a parallel or event-based gateway are never evaluated. */
  private isIgnored(flow: ModdleElement): boolean {
    const source = flow.sourceRef;
    return (
      !!source &&
      (isAny(source, ['bpmn:ParallelGateway', 'bpmn:EventBasedGateway']) || source.default === flow)
    );
  }

  private isEmpty(expression: ModdleElement): boolean {
    return !this.hasText(expression.body) && !this.hasText(expression.get('camunda:resource'));
  }

  private hasText(text: unknown): boolean {
    return typeof text === 'string' && text.trim() !== '';
  }
}

export default defineRule(
  {
    ruleName: 'c7-empty-condition',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'runtime',
  },
  C7EmptyCondition,
);
