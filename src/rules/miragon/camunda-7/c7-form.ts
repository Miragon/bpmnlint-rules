import { isAny } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7ExecutableRule } from '../../../lib/engine/c7-implementation/C7ExecutableRule';
import { CamundaAttributes } from '../../../lib/engine/c7-implementation/CamundaAttributes';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

const FORM_BINDINGS = ['deployment', 'latest', 'version'];

/**
 * Reports a `camunda:formRef` next to a `camunda:formKey`, or without a known `camunda:formRefBinding`:
 * Camunda 7 refuses the file.
 */
class C7Form extends C7ExecutableRule {
  protected checkExecutable(node: ModdleElement, reporter: Reporter): void {
    if (!isAny(node, ['bpmn:UserTask', 'bpmn:StartEvent'])) {
      return;
    }
    const attributes = new CamundaAttributes(node);
    if (attributes.defined('formRef') === undefined) {
      return;
    }
    if (attributes.defined('formKey') !== undefined) {
      reportErrors(node, reporter, {
        message: `${describeElement(node)} has both camunda:formKey and camunda:formRef; the engines refuse the file`,
        path: ['formKey'],
        data: {
          type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
          node,
          parentNode: null,
          property: 'formKey',
        },
      });
    }
    this.checkBinding(node, attributes.defined('formRefBinding'), reporter);
  }

  private checkBinding(node: ModdleElement, binding: string | undefined, reporter: Reporter): void {
    if (binding !== undefined && FORM_BINDINGS.includes(binding)) {
      return;
    }
    const found =
      binding === undefined ? 'no camunda:formRefBinding' : `camunda:formRefBinding="${binding}"`;
    reportErrors(node, reporter, {
      message: `${describeElement(node)} has camunda:formRef but ${found} (one of ${FORM_BINDINGS.join(', ')} is required); the engines refuse the file`,
      path: ['formRefBinding'],
      data:
        binding === undefined
          ? {
              type: ERROR_TYPES.PROPERTY_REQUIRED,
              node,
              parentNode: null,
              requiredProperty: 'formRefBinding',
            }
          : {
              type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
              node,
              parentNode: null,
              property: 'formRefBinding',
            },
    });
  }
}

export default defineRule(
  { ruleName: 'c7-form', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7Form,
);
