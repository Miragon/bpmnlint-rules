import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7ExecutableRule } from '../../../lib/engine/c7-implementation/C7ExecutableRule';
import { ImplementationHost } from '../../../lib/engine/c7-implementation/ImplementationHost';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/** Reports an external task, or external message throw or end event, without `camunda:topic`, which Camunda 7 refuses to deploy. */
class C7ExternalTopic extends C7ExecutableRule {
  protected checkExecutable(node: ModdleElement, reporter: Reporter): void {
    for (const host of ImplementationHost.forElement(node)) {
      if (!host.isExternal || host.attributes.defined('topic') !== undefined) {
        continue;
      }
      reportErrors(node, reporter, {
        message: `${host.label} is an external task without camunda:topic; the engines refuse the file`,
        path: host.pathTo('topic'),
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: host.element,
          parentNode: host.parentNode,
          requiredProperty: 'topic',
        },
      });
    }
  }
}

export default defineRule(
  { ruleName: 'c7-external-topic', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7ExternalTopic,
);
