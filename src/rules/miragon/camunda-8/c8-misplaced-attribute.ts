import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C8CheckedElement } from '../../../lib/engine/c8-extensions/C8CheckedElement';
import { ZeebeSchema } from '../../../lib/engine/c8-extensions/ZeebeSchema';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports a zeebe attribute on a BPMN element that does not carry it (`zeebe:modelerTemplate` on a
 * lane, `zeebe:retryCounter` on a user task): Camunda 8 reads it on other elements only.
 */
class C8MisplacedAttribute extends EngineRule {
  protected readonly engine: Engine = 'c8';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    const checked = C8CheckedElement.forNode(node);
    if (!checked) {
      return;
    }

    for (const key of checked.zeebeAttributeKeys()) {
      const localName = key.slice(key.indexOf(':') + 1);
      const owners = ZeebeSchema.instance.ownersOfHostAttribute(localName);
      if (!owners || owners.some((owner) => node.$instanceOf(owner))) {
        continue;
      }
      const readOn = owners
        .map((owner) => owner.slice('bpmn:'.length))
        .map((owner) => `${owner.charAt(0).toLowerCase()}${owner.slice(1)}`);
      checked.report(
        reporter,
        `zeebe:${localName} on ${checked.describe()} has no effect: Camunda 8 reads it on ${readOn.join(', ')} only`,
        checked.path(key),
        { type: ERROR_TYPES.PROPERTY_NOT_ALLOWED, node, property: key },
      );
    }
  }
}

export default defineRule(
  {
    ruleName: 'c8-misplaced-attribute',
    kind: 'engine-specific',
    targetEngine: 'c8',
    impact: 'runtime',
  },
  C8MisplacedAttribute,
);
