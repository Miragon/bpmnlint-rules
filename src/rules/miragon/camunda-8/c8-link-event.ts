import { is, isAny } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C8EventPosition } from '../../../lib/engine/c8-events/C8EventPosition';
import { isMissing } from '../../../lib/engine/c8-events/utils/c8Values';
import { EngineRule } from '../../../lib/engine/EngineRule';
import { LinkEvents } from '../../../lib/engine/LinkEvents';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports a link throw event whose (sub-)process has no link catch event of its name, and a link
 * event definition without a name where camunda-compat does not look: Camunda 8 refuses both.
 */
class C8LinkEvent extends EngineRule {
  protected readonly engine: Engine = 'c8';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (is(node, 'bpmn:LinkEventDefinition')) {
      this.checkName(node, reporter);
    }
    if (is(node, 'bpmn:Process') && C8EventPosition.isExecutable(node)) {
      this.checkThrows(node, reporter);
    }
  }

  private checkThrows(process: ModdleElement, reporter: Reporter): void {
    const links = new LinkEvents(process, (node) => {
      const definition = C8EventPosition.onlyDefinition(node, 'bpmn:LinkEventDefinition');
      return definition?.get('name');
    });
    for (const { el, name, scope } of links.unmatchedThrows()) {
      reportErrors(el, reporter, {
        message: `Link throw event ${el.id} goes to "${name}", but ${scope.id} has no link catch event of that name; Camunda 8 refuses the file`,
        path: ['eventDefinitions', 0, 'name'],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
          node: el.get('eventDefinitions')[0],
          parentNode: el,
          property: 'name',
        },
      });
    }
  }

  /**
   * The BPMN schema requires a name on every link event definition of the file, and Camunda 8
   * refuses an empty one. camunda-compat checks the first definition of an intermediate event in an
   * executable process; this checks the others.
   */
  private checkName(definition: ModdleElement, reporter: Reporter): void {
    const name = definition.get('name');
    if (!isMissing(name) || this.isCheckedByCompat(definition)) {
      return;
    }
    const { owner, path } = C8EventPosition.definitionOwner(definition);
    const label = owner === definition ? definition.$type : describeElement(owner);
    reportErrors(owner, reporter, {
      message: `The link event definition of ${label} has ${name === '' ? 'an empty name' : 'no name, which the BPMN schema requires'}; Camunda 8 refuses the file`,
      path: [...path, 'name'],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: definition,
        parentNode: owner === definition ? null : owner,
        requiredProperty: 'name',
      },
    });
  }

  private isCheckedByCompat(definition: ModdleElement): boolean {
    const event = definition.$parent;
    return (
      isAny(event, ['bpmn:IntermediateCatchEvent', 'bpmn:IntermediateThrowEvent']) &&
      event.get('eventDefinitions')[0] === definition &&
      C8EventPosition.isInExecutableProcess(event)
    );
  }
}

export default defineRule(
  { ruleName: 'c8-link-event', kind: 'engine-specific', targetEngine: 'c8', impact: 'deploy' },
  C8LinkEvent,
);
