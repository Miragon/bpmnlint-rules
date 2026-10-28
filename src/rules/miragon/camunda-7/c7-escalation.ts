import { is, isAny } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7EventDefinitions } from '../../../lib/engine/c7-events/C7EventDefinitions';
import { C7ExecutableScope } from '../../../lib/engine/c7-events/C7ExecutableScope';
import { EngineRule } from '../../../lib/engine/EngineRule';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

const ESCALATION_HOSTS = ['bpmn:SubProcess', 'bpmn:CallActivity', 'bpmn:UserTask'];

/**
 * Reports the escalations Camunda 7 refuses to deploy: a throw event without an escalation or with
 * an escalation without an escalationCode, and an escalation boundary event on an activity other
 * than a sub-process, call activity or user task.
 */
class C7Escalation extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:Event') || !C7ExecutableScope.contains(node)) {
      return;
    }

    const definitions = new C7EventDefinitions(node);
    const escalations = definitions
      .actedOn()
      .filter((definition) => is(definition, 'bpmn:EscalationEventDefinition'));
    if (isAny(node, ['bpmn:IntermediateThrowEvent', 'bpmn:EndEvent'])) {
      for (const definition of escalations) {
        this.checkThrown(node, definition, definitions, reporter);
      }
    } else if (is(node, 'bpmn:BoundaryEvent') && escalations.length) {
      this.checkHost(node, reporter);
    }
  }

  private checkThrown(
    event: ModdleElement,
    definition: ModdleElement,
    definitions: C7EventDefinitions,
    reporter: Reporter,
  ): void {
    const label = describeElement(event);
    const escalation = definition.escalationRef;
    if (!escalation) {
      reportErrors(event, reporter, {
        message: `${label} throws no escalation (no escalationRef); the engines refuse the file`,
        path: definitions.pathTo(definition, 'escalationRef'),
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: definition,
          parentNode: event,
          requiredProperty: 'escalationRef',
        },
      });
    } else if (!String(escalation.escalationCode ?? '').trim()) {
      reportErrors(event, reporter, {
        message: `Escalation ${escalation.id} thrown by ${label} has no escalationCode; the engines refuse the file`,
        path: definitions.pathTo(definition, 'escalationRef', 'escalationCode'),
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: escalation,
          parentNode: event,
          requiredProperty: 'escalationCode',
        },
      });
    }
  }

  private checkHost(event: ModdleElement, reporter: Reporter): void {
    const host = event.attachedToRef;
    if (!host || isAny(host, ESCALATION_HOSTS)) {
      return;
    }
    reportErrors(event, reporter, {
      message: `Escalation boundary event ${event.id} is attached to ${describeElement(host)}; the engines allow it only on sub-processes, call activities and user tasks and refuse the file`,
      path: ['attachedToRef'],
      data: {
        type: ERROR_TYPES.ATTACHED_TO_REF_ELEMENT_TYPE_NOT_ALLOWED,
        node: event,
        parentNode: null,
        attachedToRef: host,
      },
    });
  }
}

export default defineRule(
  { ruleName: 'c7-escalation', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7Escalation,
);
