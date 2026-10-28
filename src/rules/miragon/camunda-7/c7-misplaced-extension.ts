import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7Host } from '../../../lib/engine/c7-extensions/C7Host';
import { CamundaPlacement } from '../../../lib/engine/c7-extensions/CamundaPlacement';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports a camunda extension element where the Camunda 7 engines do not read it: on a host type
 * that ignores it (a task listener on a service task, camunda:inputOutput on the process), loose
 * in the extension elements instead of inside its container, or on the side of an event that
 * ignores it (camunda:field on a message catch event definition).
 */
class C7MisplacedExtension extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): boolean | void {
    if (!C7Host.visits(node)) {
      return false;
    }
    const host = new C7Host(node);
    if (host.isDefinitions()) {
      return;
    }
    const placement = new CamundaPlacement(host);
    for (const extension of host.camundaExtensions()) {
      const misplacement = placement.misplacement(extension);
      if (!misplacement) {
        continue;
      }
      host.report(reporter, {
        message: misplacement,
        path: host.extensionPath(extension.index),
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: extension.value,
        extensionElement: extension.value,
      });
    }
  }
}

export default defineRule(
  {
    ruleName: 'c7-misplaced-extension',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'runtime',
  },
  C7MisplacedExtension,
);
