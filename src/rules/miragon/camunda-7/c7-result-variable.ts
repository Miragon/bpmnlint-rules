import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7ExecutableRule } from '../../../lib/engine/c7-implementation/C7ExecutableRule';
import { ImplementationHost } from '../../../lib/engine/c7-implementation/ImplementationHost';
import { nonEmpty } from '../../../lib/engine/c7-implementation/utils/values';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports `camunda:resultVariable` next to `camunda:class` or `camunda:delegateExpression`: Camunda 7
 * supports a result variable only with `camunda:expression` and refuses the file.
 */
class C7ResultVariable extends C7ExecutableRule {
  protected checkExecutable(node: ModdleElement, reporter: Reporter): void {
    for (const host of ImplementationHost.forElement(node)) {
      const delegate = this.delegateOf(host);
      if (
        host.hasUnsupportedType ||
        delegate === undefined ||
        host.attributes.defined('resultVariable') === undefined
      ) {
        continue;
      }
      reportErrors(node, reporter, {
        message: `${host.label} combines camunda:resultVariable with camunda:${delegate}; the engines support a result variable only with camunda:expression and refuse the file`,
        path: host.pathTo('resultVariable'),
        data: {
          type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
          node: host.element,
          parentNode: host.parentNode,
          property: 'resultVariable',
        },
      });
    }
  }

  private delegateOf(host: ImplementationHost): string | undefined {
    return ['class', 'delegateExpression'].find((local) =>
      nonEmpty(host.attributes.defined(local)),
    );
  }
}

export default defineRule(
  { ruleName: 'c7-result-variable', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7ResultVariable,
);
