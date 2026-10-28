import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7ExecutableRule } from '../../../lib/engine/c7-implementation/C7ExecutableRule';
import { CamundaAttributes } from '../../../lib/engine/c7-implementation/CamundaAttributes';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/** Reports a call activity that calls nothing, or both a process and a case: Camunda 7 refuses the file. */
class C7CalledElement extends C7ExecutableRule {
  protected checkExecutable(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:CallActivity')) {
      return;
    }
    const calledElement: string | undefined = node.get('calledElement');
    const caseRef = new CamundaAttributes(node).defined('caseRef');
    if (calledElement === undefined && caseRef === undefined) {
      reportErrors(node, reporter, {
        message: `Call activity ${node.id} has no calledElement (nor camunda:caseRef); the engines refuse the file`,
        path: ['calledElement'],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node,
          parentNode: null,
          requiredProperty: 'calledElement',
        },
      });
    } else if (calledElement !== undefined && caseRef !== undefined) {
      reportErrors(node, reporter, {
        message: `Call activity ${node.id} has both calledElement and camunda:caseRef; the engines refuse the file`,
        path: ['caseRef'],
        data: {
          type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
          node,
          parentNode: null,
          property: 'caseRef',
        },
      });
    }
  }
}

export default defineRule(
  { ruleName: 'c7-called-element', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7CalledElement,
);
