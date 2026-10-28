import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7FlowGraph } from '../../../lib/engine/c7-flows/C7FlowGraph';
import { C7FlowRule } from '../../../lib/engine/c7-flows/C7FlowRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports an ad-hoc sub-process with a sequence flow, a boundary event or a multi-instance loop:
 * Camunda 7 does not run ad-hoc sub-processes and refuses the file. One that nothing connects
 * deploys and is skipped with its content.
 */
class C7AdHocSubProcess extends C7FlowRule {
  protected checkRunElement(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:AdHocSubProcess')) {
      return;
    }
    const graph = C7FlowGraph.forElement(node);
    const incoming = graph.incoming(node);
    const flows = [...incoming, ...graph.outgoing(node)];
    const boundaryEvents = graph.boundaryEvents(node);
    if (flows.length || boundaryEvents.length) {
      this.reportConnected(node, reporter, flows, incoming.length > 0, boundaryEvents);
    } else if (this.isMultiInstance(node)) {
      reportErrors(node, reporter, {
        message: `Ad-hoc sub-process ${node.id} has a multi-instance loop; the engines do not run ad-hoc sub-processes, and Camunda 7 and CIB seven refuse the file (ENGINE-01009, "activity" is null)`,
        path: ['loopCharacteristics'],
        data: {
          type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
          node,
          parentNode: null,
          property: 'loopCharacteristics',
        },
      });
    }
  }

  private reportConnected(
    node: ModdleElement,
    reporter: Reporter,
    flows: ModdleElement[],
    hasIncoming: boolean,
    boundaryEvents: ModdleElement[],
  ): void {
    const parts = [
      this.listed('sequence flow', flows),
      this.listed('boundary event', boundaryEvents),
    ].filter(Boolean);
    const refusal = flows.length
      ? `invalid ${hasIncoming ? 'destination' : 'source'} '${node.id}' of sequence flow ${flows[0].id}`
      : 'invalid reference in boundary event';
    reportErrors(node, reporter, {
      message: `Ad-hoc sub-process ${node.id} is connected (${parts.join(' and ')}); the engines do not run ad-hoc sub-processes and refuse the file (${refusal})`,
      path: null,
      data: { type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED, node, parentNode: null },
    });
  }

  private isMultiInstance(node: ModdleElement): boolean {
    const loop = node.loopCharacteristics;
    return !!loop && is(loop, 'bpmn:MultiInstanceLoopCharacteristics');
  }

  /** `sequence flows F1, F2`, or '' for none. */
  private listed(kind: string, elements: ModdleElement[]): string {
    if (!elements.length) {
      return '';
    }
    const ids = elements.map((element) => element.id).join(', ');
    return `${kind}${elements.length > 1 ? 's' : ''} ${ids}`;
  }
}

export default defineRule(
  {
    ruleName: 'c7-ad-hoc-sub-process',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'deploy',
  },
  C7AdHocSubProcess,
);
