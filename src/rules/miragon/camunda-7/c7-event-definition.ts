import { is, isAny } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7DefinitionSubject } from '../../../lib/engine/c7-events/C7DefinitionSubject';
import { C7EventDefinitions } from '../../../lib/engine/c7-events/C7EventDefinitions';
import { C7ExecutableScope } from '../../../lib/engine/c7-events/C7ExecutableScope';
import { EngineRule } from '../../../lib/engine/EngineRule';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

const TIMER_ELEMENTS = ['timeDate', 'timeCycle', 'timeDuration'];

/**
 * Reports the event definitions Camunda 7 refuses to deploy. The BPMN schema checks hold for every
 * definition in the file, also one the engines ignore or one in a non-executable process: a
 * conditional definition needs a condition, a timer at most one time element. In what the engines
 * run, the definition they act on needs a timer value, and a compensation throw event may only name
 * an activity of its own (sub-)process.
 */
class C7EventDefinition extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (is(node, 'bpmn:EventDefinition')) {
      this.checkSchema(node, reporter);
    }
    if (is(node, 'bpmn:Event') && C7ExecutableScope.contains(node)) {
      this.checkActedOn(node, reporter);
    }
  }

  private checkSchema(definition: ModdleElement, reporter: Reporter): void {
    const subject = new C7DefinitionSubject(definition);
    if (is(definition, 'bpmn:ConditionalEventDefinition') && !definition.condition) {
      reportErrors(subject.target, reporter, {
        message: `${subject.name('Conditional event')} has no condition element, which the BPMN schema requires; the engines refuse the file`,
        path: subject.path('condition'),
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: definition,
          parentNode: subject.parentNode,
          requiredProperty: 'condition',
        },
      });
    }
    const timeElements = TIMER_ELEMENTS.filter((timeElement) => definition[timeElement]);
    if (is(definition, 'bpmn:TimerEventDefinition') && timeElements.length > 1) {
      reportErrors(subject.target, reporter, {
        message: `${subject.name('Timer event')} has ${timeElements.join(' and ')}; the BPMN schema allows only one of timeDate, timeCycle and timeDuration, and the engines refuse the file`,
        path: subject.path(),
        data: {
          type: ERROR_TYPES.ELEMENT_MULTIPLE_NOT_ALLOWED,
          node: definition,
          parentNode: subject.parentNode,
        },
      });
    }
  }

  private checkActedOn(event: ModdleElement, reporter: Reporter): void {
    const definitions = new C7EventDefinitions(event);
    for (const definition of definitions.actedOn()) {
      if (is(definition, 'bpmn:TimerEventDefinition')) {
        this.checkTimerValue(event, definition, definitions, reporter);
      }
      if (
        is(definition, 'bpmn:CompensateEventDefinition') &&
        isAny(event, ['bpmn:IntermediateThrowEvent', 'bpmn:EndEvent'])
      ) {
        this.checkCompensationRef(event, definition, definitions, reporter);
      }
    }
  }

  private checkTimerValue(
    event: ModdleElement,
    definition: ModdleElement,
    definitions: C7EventDefinitions,
    reporter: Reporter,
  ): void {
    if (TIMER_ELEMENTS.some((timeElement) => definition[timeElement])) {
      return;
    }
    reportErrors(event, reporter, {
      message: `Timer of ${describeElement(event)} has no date, cycle or duration; the engines refuse the file`,
      path: definitions.pathTo(definition),
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: definition,
        parentNode: event,
        requiredProperty: TIMER_ELEMENTS,
      },
    });
  }

  /**
   * The activities a compensation throw event may name: those of its own (sub-)process, for an
   * event sub-process also those of its parent scope.
   */
  private checkCompensationRef(
    event: ModdleElement,
    definition: ModdleElement,
    definitions: C7EventDefinitions,
    reporter: Reporter,
  ): void {
    const activity = definition.activityRef;
    const scope = C7ExecutableScope.scopeOf(event);
    if (!activity || !scope) {
      return;
    }
    const allowed = [scope];
    if (C7ExecutableScope.isEventSubProcess(scope)) {
      allowed.push(C7ExecutableScope.scopeOf(scope));
    }
    const isFlowNode = is(activity, 'bpmn:FlowNode');
    if (isFlowNode && allowed.includes(C7ExecutableScope.scopeOf(activity))) {
      return;
    }
    const named = isFlowNode
      ? `${describeElement(activity)}, which is not in ${scope.id ?? '<scopeId>'}`
      : `${activity.id}, which is not a flow node`;
    reportErrors(event, reporter, {
      message: `Compensation event ${event.id} names activityRef ${named}; the engines compensate only activities of the throw event's own (sub-)process and refuse the file`,
      path: definitions.pathTo(definition, 'activityRef'),
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: definition,
        parentNode: event,
        property: 'activityRef',
      },
    });
  }
}

export default defineRule(
  {
    ruleName: 'c7-event-definition',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'deploy',
  },
  C7EventDefinition,
);
