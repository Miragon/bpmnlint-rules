import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C8CheckedElement } from '../../../lib/engine/c8-extensions/C8CheckedElement';
import { CAMUNDA_7_PREFIX_BY_URI } from '../../../lib/engine/c8-extensions/namespaces';
import { DiagramNamespaces } from '../../../lib/engine/DiagramNamespaces';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/** The zeebe content Camunda 8 reads in place of a Camunda 7 attribute or element. */
const CAMUNDA_8_EQUIVALENT = new Map(
  Object.entries({
    assignee: 'zeebe:assignmentDefinition assignee',
    candidateGroups: 'zeebe:assignmentDefinition candidateGroups',
    candidateUsers: 'zeebe:assignmentDefinition candidateUsers',
    dueDate: 'zeebe:taskSchedule dueDate',
    followUpDate: 'zeebe:taskSchedule followUpDate',
    priority: 'zeebe:priorityDefinition priority',
    formKey: 'zeebe:formDefinition formId',
    topic: 'zeebe:taskDefinition type',
    type: 'zeebe:taskDefinition type',
    class: 'zeebe:taskDefinition type',
    delegateExpression: 'zeebe:taskDefinition type',
    expression: 'zeebe:taskDefinition type',
    decisionRef: 'zeebe:calledDecision decisionId',
    inputOutput: 'zeebe:ioMapping',
    versionTag: 'zeebe:versionTag value',
  }),
);

/**
 * Reports Camunda 7 content (`camunda:` and `operaton:` attributes and extension elements) in a
 * Camunda 8 diagram: Camunda 8 ignores it, so the setting it carries does not happen.
 */
class C8ForeignContent extends EngineRule {
  protected readonly engine: Engine = 'c8';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    const checked = C8CheckedElement.forNode(node);
    if (!checked) {
      return;
    }

    const namespaces = DiagramNamespaces.forElement(node);
    for (const key of Object.keys(node.$attrs ?? {})) {
      const prefix = CAMUNDA_7_PREFIX_BY_URI.get(namespaces.uriOf(key) ?? '');
      if (!prefix) {
        continue;
      }
      const localName = key.slice(key.indexOf(':') + 1);
      checked.report(
        reporter,
        `${checked.describe()} carries the Camunda 7 attribute ${prefix}:${localName}, which Camunda 8 ignores${this.equivalentOf(localName)}`,
        checked.path(key),
        { type: ERROR_TYPES.PROPERTY_NOT_ALLOWED, node, property: key },
      );
    }

    checked.extensionValues().forEach((value, index) => {
      const type = String(value.$type ?? '');
      const prefix = value.$descriptor?.isGeneric
        ? CAMUNDA_7_PREFIX_BY_URI.get(namespaces.uriOf(type) ?? '')
        : undefined;
      if (!prefix) {
        return;
      }
      const localName = type.slice(type.indexOf(':') + 1);
      checked.report(
        reporter,
        `${checked.describe()} contains the Camunda 7 extension ${prefix}:${localName}, which Camunda 8 ignores${this.equivalentOf(localName)}`,
        checked.extensionPath(index),
        { type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED, node, extensionElement: value },
      );
    });
  }

  private equivalentOf(localName: string): string {
    const equivalent = CAMUNDA_8_EQUIVALENT.get(localName);
    return equivalent ? ` (it reads ${equivalent})` : '';
  }
}

export default defineRule(
  {
    ruleName: 'c8-foreign-content',
    kind: 'engine-specific',
    targetEngine: 'c8',
    impact: 'runtime',
  },
  C8ForeignContent,
);
