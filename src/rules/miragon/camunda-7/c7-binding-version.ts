import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7ExecutableRule } from '../../../lib/engine/c7-implementation/C7ExecutableRule';
import { CamundaAttributes } from '../../../lib/engine/c7-implementation/CamundaAttributes';
import { ReferenceBinding } from '../../../lib/engine/c7-implementation/ReferenceBinding';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports a binding of `version` or `versionTag` without the version or tag it binds to, on a call
 * activity, business rule task or form reference: Camunda 7 refuses the file.
 */
class C7BindingVersion extends C7ExecutableRule {
  protected checkExecutable(node: ModdleElement, reporter: Reporter): void {
    for (const binding of ReferenceBinding.forElement(node)) {
      const problem = binding.problem;
      if (problem === 'version') {
        this.report(node, binding.binding, 'version', binding.version, reporter);
      } else if (problem === 'versionTag') {
        this.report(node, binding.binding, 'versionTag', binding.versionTag!, reporter);
      }
    }
    if (is(node, 'bpmn:UserTask') || is(node, 'bpmn:StartEvent')) {
      this.checkFormBinding(node, reporter);
    }
  }

  private checkFormBinding(node: ModdleElement, reporter: Reporter): void {
    const attributes = new CamundaAttributes(node);
    if (
      attributes.defined('formRef') !== undefined &&
      attributes.defined('formRefBinding') === 'version' &&
      attributes.defined('formRefVersion') === undefined
    ) {
      this.report(node, 'formRefBinding', 'version', 'formRefVersion', reporter);
    }
  }

  private report(
    node: ModdleElement,
    binding: string,
    value: string,
    missing: string,
    reporter: Reporter,
  ): void {
    reportErrors(node, reporter, {
      message: `${describeElement(node)} has camunda:${binding}="${value}" but no camunda:${missing}; the engines refuse the file`,
      path: [missing],
      data: {
        type: ERROR_TYPES.PROPERTY_DEPENDENT_REQUIRED,
        node,
        parentNode: null,
        property: binding,
        dependentRequiredProperty: missing,
      },
    });
  }
}

export default defineRule(
  { ruleName: 'c7-binding-version', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7BindingVersion,
);
