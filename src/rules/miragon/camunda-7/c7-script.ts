import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7ExecutableRule } from '../../../lib/engine/c7-implementation/C7ExecutableRule';
import { CamundaAttributes } from '../../../lib/engine/c7-implementation/CamundaAttributes';
import { nonEmpty } from '../../../lib/engine/c7-implementation/utils/values';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/** Reports a script task with neither a script nor `camunda:resource`, which Camunda 7 refuses to deploy. */
class C7Script extends C7ExecutableRule {
  protected checkExecutable(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:ScriptTask')) {
      return;
    }
    if (
      nonEmpty(node.get('script')) ||
      new CamundaAttributes(node).defined('resource') !== undefined
    ) {
      return;
    }
    reportErrors(node, reporter, {
      message: `Script task ${node.id} has neither a script nor camunda:resource; the engines refuse the file`,
      path: ['script'],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node,
        parentNode: null,
        requiredProperty: ['script', 'resource'],
      },
    });
  }
}

export default defineRule(
  { ruleName: 'c7-script', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7Script,
);
