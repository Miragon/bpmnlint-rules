import { is, isAny } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C8EventPosition } from '../../../lib/engine/c8-events/C8EventPosition';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports a start or end event inside an ad-hoc sub-process, which Camunda 8 refuses to deploy. The
 * report goes on the event, the element to remove.
 */
class C8AdHocSubProcess extends EngineRule {
  protected readonly engine: Engine = 'c8';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:AdHocSubProcess') || !C8EventPosition.isExecutable(node)) {
      return;
    }

    for (const child of node.get('flowElements') ?? []) {
      if (!isAny(child, ['bpmn:StartEvent', 'bpmn:EndEvent'])) {
        continue;
      }
      reportErrors(child, reporter, {
        message: `Ad-hoc sub-process ${node.id} contains the ${is(child, 'bpmn:StartEvent') ? 'start' : 'end'} event ${child.id}; Camunda 8 refuses start and end events in ad-hoc sub-processes`,
        path: null,
        data: {
          type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
          node: child,
          parentNode: node,
        },
      });
    }
  }
}

export default defineRule(
  {
    ruleName: 'c8-ad-hoc-sub-process',
    kind: 'engine-specific',
    targetEngine: 'c8',
    impact: 'deploy',
  },
  C8AdHocSubProcess,
);
