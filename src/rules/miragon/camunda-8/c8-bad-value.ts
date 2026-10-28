import { is, isAny } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C8Events } from '../../../lib/engine/c8-tasks/C8Events';
import { ExecutableScope } from '../../../lib/engine/c8-tasks/ExecutableScope';
import { ModdlePath } from '../../../lib/engine/c8-tasks/ModdlePath';
import { isBlank, isFeel } from '../../../lib/engine/c8-tasks/utils/value';
import { ZeebeExtensions } from '../../../lib/engine/c8-tasks/ZeebeExtensions';
import { EngineRule } from '../../../lib/engine/EngineRule';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports values Camunda 8 deploys but cannot use: job retries that are no number (an incident on
 * every instance) and task headers without key or value (dropped from the job).
 */
class C8BadValue extends EngineRule {
  protected readonly engine: Engine = 'c8';

  private static readonly JOB_TASKS = [
    'bpmn:ServiceTask',
    'bpmn:SendTask',
    'bpmn:ScriptTask',
    'bpmn:BusinessRuleTask',
  ];

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (is(node, 'zeebe:TaskHeaders') || is(node, 'zeebe:ExecutionListeners')) {
      this.checkHeadersOf(node, reporter);
      return;
    }
    if (this.isJobHost(node) && ExecutableScope.covers(node)) {
      this.checkRetries(node, reporter);
    }
  }

  private isJobHost(node: ModdleElement): boolean {
    if (isAny(node, C8BadValue.JOB_TASKS)) {
      return true;
    }
    const definition = is(node, 'bpmn:ThrowEvent') ? C8Events.definitionOf(node) : undefined;
    return !!definition && is(definition, 'bpmn:MessageEventDefinition');
  }

  private checkRetries(node: ModdleElement, reporter: Reporter): void {
    const taskDefinition = ZeebeExtensions.valuesOf(node, 'zeebe:TaskDefinition')[0];
    const retries = taskDefinition?.retries;
    if (retries === undefined || isFeel(retries) || /^\s*-?\d+\s*$/.test(retries)) {
      return;
    }
    reportErrors(node, reporter, {
      message: `The zeebe:taskDefinition of ${describeElement(node)} has retries="${retries}", which is no number; it deploys, but every instance gets an incident when it reaches ${node.id}`,
      path: [...ModdlePath.between(node, taskDefinition), 'retries'],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: taskDefinition,
        parentNode: node,
        property: 'retries',
      },
    });
  }

  private checkHeadersOf(node: ModdleElement, reporter: Reporter): void {
    const host = ZeebeExtensions.readHostOf(node);
    if (!host) {
      return;
    }
    if (is(node, 'zeebe:TaskHeaders')) {
      this.checkHeaders(node, host, '', reporter);
      return;
    }
    if (is(host, 'bpmn:SequenceFlow')) {
      return;
    }
    (node.listeners ?? []).forEach((listener: ModdleElement, index: number) => {
      if (listener.headers) {
        this.checkHeaders(listener.headers, host, `execution listener ${index + 1} of `, reporter);
      }
    });
  }

  private checkHeaders(
    headers: ModdleElement,
    host: ModdleElement,
    inListener: string,
    reporter: Reporter,
  ): void {
    const owner = ModdlePath.ownerOf(host);
    const where = `${inListener}${host.id ? describeElement(host) : describeElement(host, owner)}`;
    (headers.values ?? []).forEach((header: ModdleElement, index: number) => {
      const missing = isBlank(header.key) ? 'key' : isBlank(header.value) ? 'value' : undefined;
      if (!missing) {
        return;
      }
      reportErrors(owner, reporter, {
        message: `Task header ${header.key ? `"${header.key}"` : index + 1} of ${where} has no ${missing}; Camunda 8 drops it, the job does not carry it`,
        path: [...ModdlePath.between(owner, header), missing],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: header,
          parentNode: owner,
          requiredProperty: missing,
        },
      });
    });
  }
}

export default defineRule(
  { ruleName: 'c8-bad-value', kind: 'engine-specific', targetEngine: 'c8', impact: 'runtime' },
  C8BadValue,
);
