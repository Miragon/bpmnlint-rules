import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7ExecutableRule } from '../../../lib/engine/c7-implementation/C7ExecutableRule';
import { CamundaAttributes } from '../../../lib/engine/c7-implementation/CamundaAttributes';
import { ImplementationHost } from '../../../lib/engine/c7-implementation/ImplementationHost';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

const IMPLEMENTATIONS = ['class', 'delegateExpression', 'expression', 'type'];
const MISPLACED = [...IMPLEMENTATIONS, 'topic'];

/**
 * Reports a message throw or end event without an implementation: Camunda 7 deploys it, sends
 * nothing and runs it like a none event.
 */
class C7MessageImplementation extends C7ExecutableRule {
  protected checkExecutable(node: ModdleElement, reporter: Reporter): void {
    for (const host of ImplementationHost.forElement(node)) {
      if (
        !host.isEvent ||
        host.hasUnsupportedType ||
        host.hasImplementation ||
        this.hasMisplacedImplementation(node)
      ) {
        continue;
      }
      reportErrors(node, reporter, {
        message: `${host.label} has no implementation: it sends nothing and behaves like a none event at run time`,
        path: host.pathTo('type'),
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: host.element,
          parentNode: node,
          requiredProperty: IMPLEMENTATIONS,
        },
      });
    }
  }

  /** An implementation on the event instead of its message definition, which c7-misplaced-attribute reports. */
  private hasMisplacedImplementation(event: ModdleElement): boolean {
    const attributes = new CamundaAttributes(event);
    return MISPLACED.some((local) => attributes.any(local) !== undefined);
  }
}

export default defineRule(
  {
    ruleName: 'c7-message-implementation',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'runtime',
  },
  C7MessageImplementation,
);
