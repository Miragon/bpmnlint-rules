import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C8EventPosition } from '../../../lib/engine/c8-events/C8EventPosition';
import { FlowIndex } from '../../../lib/engine/c8-events/FlowIndex';
import { SubscriptionGroups } from '../../../lib/engine/c8-events/SubscriptionGroups';
import { isBlank, isFeel } from '../../../lib/engine/c8-events/utils/c8Values';
import { EngineRule } from '../../../lib/engine/EngineRule';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports error catch events Camunda 8 refuses to deploy: one whose error code is a FEEL
 * expression, a non-interrupting one, and one error code (or two catch-alls) twice among the
 * boundary events of an activity or the starts of a scope's event sub-processes.
 */
class C8Error extends EngineRule {
  protected readonly engine: Engine = 'c8';
  private readonly flows = new FlowIndex();

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (!C8EventPosition.isExecutable(node)) {
      return;
    }
    if (is(node, 'bpmn:CatchEvent')) {
      this.checkCatch(node, reporter);
    }
    if (is(node, 'bpmn:Process') || is(node, 'bpmn:SubProcess')) {
      this.checkScope(node, reporter);
    }
  }

  private checkCatch(node: ModdleElement, reporter: Reporter): void {
    const definition = C8EventPosition.definitionOfType(node, 'bpmn:ErrorEventDefinition');
    if (!definition) {
      return;
    }
    const error = definition.get('errorRef');
    const code = error?.get('errorCode');
    if (isFeel(code)) {
      reportErrors(node, reporter, {
        message: `${describeElement(node)} catches the error code "${code}", an expression; Camunda 8 needs a static code on catching error events and refuses the file`,
        path: ['eventDefinitions', 0, 'errorRef', 'errorCode'],
        data: {
          type: ERROR_TYPES.EXPRESSION_NOT_ALLOWED,
          node: error,
          parentNode: node,
          property: 'errorCode',
        },
      });
    }
    const interruptingProperty = is(node, 'bpmn:BoundaryEvent')
      ? 'cancelActivity'
      : 'isInterrupting';
    if (is(node, 'bpmn:IntermediateCatchEvent') || node.get(interruptingProperty) !== false) {
      return;
    }
    reportErrors(node, reporter, {
      message: `${describeElement(node)} is a non-interrupting error event; Camunda 8 refuses it (error events always interrupt)`,
      path: [interruptingProperty],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node,
        parentNode: null,
        property: interruptingProperty,
      },
    });
  }

  private checkScope(scope: ModdleElement, reporter: Reporter): void {
    const groups = new SubscriptionGroups(scope, this.flows);
    for (const { activity, boundaries } of groups.boundaryGroups()) {
      this.reportDuplicates(boundaries, `the boundary events of ${activity.id}`, reporter);
    }
    this.reportDuplicates(
      groups.eventSubProcessStarts(),
      `the event sub-processes of ${scope.id}`,
      reporter,
    );
  }

  private reportDuplicates(events: ModdleElement[], where: string, reporter: Reporter): void {
    const duplicates = SubscriptionGroups.duplicates(events, (el) => this.codeKeyOf(el));
    for (const { first, el, key } of duplicates) {
      reportErrors(el, reporter, {
        message: key
          ? `${describeElement(el)} catches the error code "${key}" like ${describeElement(first)} (${where}); Camunda 8 refuses one code twice in a scope`
          : `${describeElement(el)} and ${describeElement(first)} both catch every error (no error code) (${where}); Camunda 8 allows one catch-all per scope`,
        path: ['eventDefinitions', 0, 'errorRef'],
        data: {
          type: ERROR_TYPES.ELEMENT_PROPERTY_VALUE_DUPLICATED,
          node: el,
          parentNode: null,
          duplicatedProperty: 'errorCode',
          duplicatedPropertyValue: key,
        },
      });
    }
  }

  /** The error code `el` catches, `''` for every error, `undefined` for no error event. */
  private codeKeyOf(el: ModdleElement): string | undefined {
    const definition = C8EventPosition.onlyDefinition(el, 'bpmn:ErrorEventDefinition');
    if (!definition) {
      return undefined;
    }
    const code = definition.get('errorRef')?.get('errorCode');
    return isBlank(code) ? '' : code;
  }
}

export default defineRule(
  { ruleName: 'c8-error', kind: 'engine-specific', targetEngine: 'c8', impact: 'deploy' },
  C8Error,
);
