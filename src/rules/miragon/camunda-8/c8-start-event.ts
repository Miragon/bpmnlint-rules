import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C8EventPosition } from '../../../lib/engine/c8-events/C8EventPosition';
import { triggerName } from '../../../lib/engine/c8-events/utils/c8Values';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports start events Camunda 8 refuses to deploy: a triggered start event of an embedded
 * sub-process, and several start events in one sub-process or event sub-process.
 */
class C8StartEvent extends EngineRule {
  protected readonly engine: Engine = 'c8';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (!C8EventPosition.isExecutable(node)) {
      return;
    }
    if (C8EventPosition.isEmbeddedSubProcessStart(node)) {
      this.checkTrigger(node, reporter);
    }
    if (is(node, 'bpmn:SubProcess') && !is(node, 'bpmn:AdHocSubProcess')) {
      this.checkStartCount(node, reporter);
    }
  }

  private checkTrigger(node: ModdleElement, reporter: Reporter): void {
    const definitions = node.get('eventDefinitions');
    const [definition] = definitions;
    if (definitions.length !== 1 || is(definition, 'bpmn:CancelEventDefinition')) {
      return;
    }
    reportErrors(node, reporter, {
      message: `Start event ${node.id} of sub-process ${node.$parent.id} has a ${triggerName(definition)} trigger; Camunda 8 allows only a none start event in an embedded sub-process and refuses the file`,
      path: ['eventDefinitions', 0],
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node,
        parentNode: null,
        eventDefinition: definition,
      },
    });
  }

  /** A sub-process without a start event is bpmnlint's `start-event-required`. */
  private checkStartCount(node: ModdleElement, reporter: Reporter): void {
    const starts = (node.get('flowElements') ?? []).filter((element: ModdleElement) =>
      is(element, 'bpmn:StartEvent'),
    );
    if (starts.length < 2) {
      return;
    }
    const kind = C8EventPosition.isEventSubProcess(node) ? 'Event sub-process' : 'Sub-process';
    reportErrors(node, reporter, {
      message: `${kind} ${node.id} has ${starts.length} start events; Camunda 8 needs exactly one and refuses the file`,
      path: ['flowElements'],
      data: {
        type: ERROR_TYPES.ELEMENT_MULTIPLE_NOT_ALLOWED,
        node,
        parentNode: null,
      },
    });
  }
}

export default defineRule(
  { ruleName: 'c8-start-event', kind: 'engine-specific', targetEngine: 'c8', impact: 'deploy' },
  C8StartEvent,
);
