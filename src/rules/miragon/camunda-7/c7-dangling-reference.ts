import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7Host } from '../../../lib/engine/c7-extensions/C7Host';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports an id reference inside a camunda extension element (the errorRef of
 * camunda:errorEventDefinition) that points to an element of another type; the Camunda 7 engines
 * ignore the mapping when it runs.
 */
class C7DanglingReference extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): boolean | void {
    if (!C7Host.visits(node)) {
      return false;
    }
    const host = new C7Host(node);
    if (host.isDefinitions()) {
      return;
    }
    for (const { value, index, local } of host.camundaExtensions()) {
      for (const property of value.$descriptor?.properties ?? []) {
        if (!property.isReference || !property.isAttr || property.isMany) {
          continue;
        }
        const name: string = property.ns?.localName ?? property.name;
        const referenced = value.get(property.name);
        if (!referenced || referenced.$instanceOf(property.type)) {
          continue;
        }
        host.report(reporter, {
          message: `camunda:${local} of ${host.describe()} references ${name}="${referenced.id}", which is not a ${property.type} in the file; the engines ignore the mapping when it runs`,
          path: host.extensionPath(index, name),
          type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
          node: value,
          property: name,
        });
      }
    }
  }
}

export default defineRule(
  {
    ruleName: 'c7-dangling-reference',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'runtime',
  },
  C7DanglingReference,
);
