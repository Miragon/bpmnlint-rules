import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import {
  C8CheckedElement,
  type ZeebeValue,
} from '../../../lib/engine/c8-extensions/C8CheckedElement';
import { ZeebeSchema } from '../../../lib/engine/c8-extensions/ZeebeSchema';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports two or more of a zeebe extension element Camunda 8 reads once per element (two
 * `zeebe:taskDefinition`, two `zeebe:ioMapping`, ...): it refuses the file.
 */
class C8DuplicateExtension extends EngineRule {
  protected readonly engine: Engine = 'c8';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    const checked = C8CheckedElement.forNode(node);
    if (!checked) {
      return;
    }

    const byName = new Map<string, ZeebeValue[]>();
    for (const zeebeValue of checked.zeebeValues()) {
      if (zeebeValue.placement === 'read' && ZeebeSchema.instance.isSingle(zeebeValue.type)) {
        byName.set(zeebeValue.type.name, [...(byName.get(zeebeValue.type.name) ?? []), zeebeValue]);
      }
    }

    for (const [name, zeebeValues] of byName) {
      const [, second] = zeebeValues;
      if (!second) {
        continue;
      }
      checked.report(
        reporter,
        `${checked.describe()} has ${zeebeValues.length} ${name} elements; Camunda 8 reads one and refuses the file`,
        checked.extensionPath(second.index),
        {
          type: ERROR_TYPES.ELEMENT_MULTIPLE_NOT_ALLOWED,
          node: checked.el,
          extensionElement: second.value,
        },
      );
    }
  }
}

export default defineRule(
  {
    ruleName: 'c8-duplicate-extension',
    kind: 'engine-specific',
    targetEngine: 'c8',
    impact: 'deploy',
  },
  C8DuplicateExtension,
);
