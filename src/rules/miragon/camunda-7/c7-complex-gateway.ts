import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7FlowGraph } from '../../../lib/engine/c7-flows/C7FlowGraph';
import { C7FlowRule } from '../../../lib/engine/c7-flows/C7FlowRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports a complex gateway a sequence flow connects: Camunda 7 does not run complex gateways and
 * refuses the file. One that nothing connects deploys.
 */
class C7ComplexGateway extends C7FlowRule {
  protected checkRunElement(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:ComplexGateway')) {
      return;
    }
    const graph = C7FlowGraph.forElement(node);
    const incoming = graph.incoming(node);
    const flows = [...incoming, ...graph.outgoing(node)];
    if (!flows.length) {
      return;
    }
    const end = incoming.length ? 'destination' : 'source';
    reportErrors(node, reporter, {
      message: `Complex gateway ${node.id} is connected; the engines do not run complex gateways and refuse the file (invalid ${end} '${node.id}' of sequence flow ${flows[0].id})`,
      path: null,
      data: { type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED, node, parentNode: null },
    });
  }
}

export default defineRule(
  { ruleName: 'c7-complex-gateway', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7ComplexGateway,
);
