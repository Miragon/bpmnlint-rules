import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports `bpmn:extensionElements` directly under `bpmn:definitions`: the BPMN schema does not
 * allow them there, and Camunda 7 validates the file against it and refuses it.
 */
class C7DefinitionsExtension extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:Definitions')) {
      return;
    }
    const values: ModdleElement[] = node.extensionElements?.values ?? [];
    if (!values.length) {
      return;
    }
    const types = values.map((value) => this.xmlName(value.$type)).join(', ');
    reportErrors(node, reporter, {
      message: `bpmn:definitions carries bpmn:extensionElements (${types}), which the BPMN schema does not allow there; the engines refuse the file`,
      path: ['extensionElements'],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node,
        parentNode: null,
        property: 'extensionElements',
      },
    });
  }

  /** `camunda:properties` for the typed `camunda:Properties`, as the file spells it. */
  private xmlName(type: string): string {
    const colon = type.indexOf(':');
    return `${type.slice(0, colon + 1)}${type.charAt(colon + 1).toLowerCase()}${type.slice(colon + 2)}`;
  }
}

export default defineRule(
  {
    ruleName: 'c7-definitions-extension',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'deploy',
  },
  C7DefinitionsExtension,
);
