import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7ExecutableScope } from '../../../lib/engine/c7-events/C7ExecutableScope';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports a transaction without a start event: Camunda 7 deploys it, but every instance that
 * reaches it fails.
 */
class C7TransactionStart extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:Transaction') || !C7ExecutableScope.contains(node)) {
      return;
    }

    const nodes: ModdleElement[] = (node.flowElements ?? []).filter((element: ModdleElement) =>
      is(element, 'bpmn:FlowNode'),
    );
    if (nodes.some((element) => is(element, 'bpmn:StartEvent'))) {
      return;
    }

    const what = nodes.length ? 'has no start event' : 'is empty, without a start event';
    reportErrors(node, reporter, {
      message: `Transaction ${node.id} ${what}: it deploys, but every instance that reaches it fails ("No initial activity found for subprocess ${node.id}")`,
      path: ['flowElements'],
      data: {
        type: ERROR_TYPES.CHILD_ELEMENT_OF_TYPE_REQUIRED,
        node,
        parentNode: null,
        requiredType: 'bpmn:StartEvent',
      },
    });
  }
}

export default defineRule(
  {
    ruleName: 'c7-transaction-start',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'runtime',
  },
  C7TransactionStart,
);
