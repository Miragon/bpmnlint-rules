import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7ExecutableRule } from '../../../lib/engine/c7-implementation/C7ExecutableRule';
import { CamundaAttributes } from '../../../lib/engine/c7-implementation/CamundaAttributes';
import { nonEmpty } from '../../../lib/engine/c7-implementation/utils/values';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports a multi-instance loop Camunda 7 refuses to deploy: no loop cardinality and no collection,
 * an empty cardinality, or an element variable without a collection. A `loopDataInputRef` counts as
 * a collection, as the engines read it as a variable name.
 */
class C7MultiInstance extends C7ExecutableRule {
  protected checkExecutable(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:Activity')) {
      return;
    }
    const loop = node.get('loopCharacteristics');
    if (!loop || !is(loop, 'bpmn:MultiInstanceLoopCharacteristics')) {
      return;
    }
    const loopAttributes = new CamundaAttributes(loop);
    const cardinality = loop.get('loopCardinality');
    const hasCollection =
      loopAttributes.defined('collection') !== undefined || !!loop.get('loopDataInputRef');
    if (!cardinality && !hasCollection) {
      this.reportNoInput(node, loop, reporter);
      return;
    }
    if (cardinality && !nonEmpty(cardinality.get('body')) && !hasCollection) {
      reportErrors(node, reporter, {
        message: `Multi-instance ${describeElement(node)} has an empty loop cardinality; the engines refuse the file`,
        path: ['loopCharacteristics', 'loopCardinality'],
        data: {
          type: ERROR_TYPES.EXPRESSION_REQUIRED,
          node: loop,
          parentNode: node,
          property: 'loopCardinality',
        },
      });
    }
    if (loopAttributes.defined('elementVariable') !== undefined && !hasCollection) {
      reportErrors(node, reporter, {
        message: `Multi-instance ${describeElement(node)} has camunda:elementVariable but no camunda:collection; the engines refuse the file`,
        path: ['loopCharacteristics', 'collection'],
        data: {
          type: ERROR_TYPES.PROPERTY_DEPENDENT_REQUIRED,
          node: loop,
          parentNode: node,
          property: 'elementVariable',
          dependentRequiredProperty: 'collection',
        },
      });
    }
  }

  private reportNoInput(activity: ModdleElement, loop: ModdleElement, reporter: Reporter): void {
    const misplaced =
      new CamundaAttributes(activity).any('collection') !== undefined
        ? ' (camunda:collection sits on the activity, not on the loop)'
        : '';
    reportErrors(activity, reporter, {
      message: `Multi-instance ${describeElement(activity)} has neither a loop cardinality nor camunda:collection${misplaced}; the engines refuse the file`,
      path: ['loopCharacteristics', 'collection'],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: loop,
        parentNode: activity,
        requiredProperty: ['loopCardinality', 'collection'],
      },
    });
  }
}

export default defineRule(
  { ruleName: 'c7-multi-instance', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7MultiInstance,
);
