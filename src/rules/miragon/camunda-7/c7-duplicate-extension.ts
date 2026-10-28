import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7Host } from '../../../lib/engine/c7-extensions/C7Host';
import { CamundaDuplicates } from '../../../lib/engine/c7-extensions/CamundaDuplicates';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports a second camunda:inputOutput, connector, formData or failedJobRetryTimeCycle where the
 * Camunda 7 engines read one; they refuse the file (ENGINE-01009).
 */
class C7DuplicateExtension extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): boolean | void {
    if (!C7Host.visits(node)) {
      return false;
    }
    const host = new C7Host(node);
    if (host.isDefinitions() || !C7Host.isExecutable(node)) {
      return;
    }
    for (const { local, extensions, isRead } of new CamundaDuplicates(host).groups()) {
      const [, second] = extensions;
      if (!isRead || !second) {
        continue;
      }
      host.report(reporter, {
        message: `${host.describe()} has ${extensions.length} camunda:${local} elements; the engines refuse the file (ENGINE-01009 multiple elements with tag name ${local})`,
        path: host.extensionPath(second.index),
        type: ERROR_TYPES.ELEMENT_MULTIPLE_NOT_ALLOWED,
        node: second.value,
      });
    }
  }
}

export default defineRule(
  {
    ruleName: 'c7-duplicate-extension',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'deploy',
  },
  C7DuplicateExtension,
);
