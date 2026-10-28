import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C8Events } from '../../../lib/engine/c8-tasks/C8Events';
import { ExecutableScope } from '../../../lib/engine/c8-tasks/ExecutableScope';
import { ModdlePath } from '../../../lib/engine/c8-tasks/ModdlePath';
import { hasName } from '../../../lib/engine/c8-tasks/utils/value';
import { EngineRule } from '../../../lib/engine/EngineRule';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports a send task or message throw event whose message has no name: Camunda 8 refuses the
 * file. camunda-compat checks the message name of catching elements only.
 */
class C8Implementation extends EngineRule {
  protected readonly engine: Engine = 'c8';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    const holder = this.messageHolderOf(node);
    const message = holder?.messageRef;
    if (!message || hasName(message) || !ExecutableScope.covers(node)) {
      return;
    }

    reportErrors(node, reporter, {
      message: `Message ${message.id} of ${describeElement(node)} has no name; Camunda 8 refuses the file`,
      path: [...ModdlePath.between(node, holder), 'messageRef', 'name'],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: message,
        parentNode: node,
        requiredProperty: 'name',
      },
    });
  }

  private messageHolderOf(node: ModdleElement): ModdleElement | undefined {
    if (is(node, 'bpmn:SendTask')) {
      return node;
    }
    if (!is(node, 'bpmn:ThrowEvent')) {
      return undefined;
    }
    const definition = C8Events.definitionOf(node);
    return definition && is(definition, 'bpmn:MessageEventDefinition') ? definition : undefined;
  }
}

export default defineRule(
  { ruleName: 'c8-implementation', kind: 'engine-specific', targetEngine: 'c8', impact: 'deploy' },
  C8Implementation,
);
