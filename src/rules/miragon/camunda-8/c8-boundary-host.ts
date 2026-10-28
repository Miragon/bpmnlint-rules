import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/** Reports a boundary event attached to a compensation handler, which Camunda 8 refuses to deploy. */
class C8BoundaryHost extends EngineRule {
  protected readonly engine: Engine = 'c8';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:BoundaryEvent')) {
      return;
    }

    const host = node.get('attachedToRef');
    if (host?.get('isForCompensation') !== true) {
      return;
    }

    reportErrors(node, reporter, {
      message: `Boundary event ${node.id} is attached to the compensation handler ${host.id}; Camunda 8 refuses boundary events on compensation handlers`,
      path: ['attachedToRef'],
      data: {
        type: ERROR_TYPES.ATTACHED_TO_REF_ELEMENT_TYPE_NOT_ALLOWED,
        node,
        parentNode: null,
        attachedToRef: host,
      },
    });
  }
}

export default defineRule(
  { ruleName: 'c8-boundary-host', kind: 'engine-specific', targetEngine: 'c8', impact: 'deploy' },
  C8BoundaryHost,
);
