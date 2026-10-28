import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7Host, type HostExtension } from '../../../lib/engine/c7-extensions/C7Host';
import { CamundaPlacement } from '../../../lib/engine/c7-extensions/CamundaPlacement';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

const EXECUTION_EVENTS = ['start', 'end'];
const TASK_EVENTS = ['create', 'assignment', 'complete', 'update', 'delete', 'timeout'];
const IMPLEMENTATIONS = ['class', 'expression', 'delegateExpression'];

/**
 * Reports execution and task listeners the Camunda 7 engines refuse to deploy: without
 * implementation, without event or with an event they do not know, with a script without
 * scriptFormat, and timeout task listeners without timer or id.
 */
class C7Listener extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): boolean | void {
    if (!C7Host.visits(node)) {
      return false;
    }
    const host = new C7Host(node);
    if (host.isDefinitions() || !C7Host.isExecutable(node)) {
      return;
    }
    const placement = new CamundaPlacement(host);
    for (const extension of placement.readExtensions()) {
      if (extension.local === 'executionListener' || extension.local === 'taskListener') {
        this.checkListener(host, extension, reporter);
      }
    }
  }

  private checkListener(host: C7Host, extension: HostExtension, reporter: Reporter): void {
    const { value: listener, index, local } = extension;
    const event: string | undefined = listener.get('event');
    const label = `camunda:${local}${event ? ` (event ${event})` : ''} of ${host.describe()}`;
    const report = (message: string, steps: (string | number)[], type: string, details = {}) =>
      host.report(reporter, {
        message,
        path: host.extensionPath(index, ...steps),
        type,
        node: listener,
        ...details,
      });

    if (!this.hasImplementation(listener)) {
      report(
        `${label} has no class, expression, delegateExpression or script; the engines refuse the file`,
        [],
        ERROR_TYPES.PROPERTY_REQUIRED,
        { requiredProperty: [...IMPLEMENTATIONS, 'script'] },
      );
    }
    if (!is(host.node, 'bpmn:SequenceFlow')) {
      const allowed = local === 'taskListener' ? TASK_EVENTS : EXECUTION_EVENTS;
      if (event === undefined) {
        report(
          `${label} has no event (one of ${allowed.join(', ')}); the engines refuse the file`,
          ['event'],
          ERROR_TYPES.PROPERTY_REQUIRED,
          { requiredProperty: 'event' },
        );
      } else if (!allowed.includes(event)) {
        const take =
          event === 'take' && local === 'executionListener'
            ? ' (take is read on sequence flows only)'
            : '';
        report(
          `${label}: event "${event}" is not one of ${allowed.join(', ')}${take}; the engines refuse the file`,
          ['event'],
          ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
          { property: 'event' },
        );
      }
    }
    if (listener.script && !this.nonEmpty(listener.script.get('scriptFormat'))) {
      report(
        `The script of ${label} has no scriptFormat; the engines refuse the file`,
        ['script', 'scriptFormat'],
        ERROR_TYPES.PROPERTY_REQUIRED,
        { requiredProperty: 'scriptFormat' },
      );
    }
    if (local === 'taskListener' && event === 'timeout') {
      this.checkTimeout(listener, label, report);
    }
  }

  private checkTimeout(
    listener: ModdleElement,
    label: string,
    report: (message: string, steps: string[], type: string, details?: object) => void,
  ): void {
    const hasTimer = (listener.get('eventDefinitions') ?? []).some((definition: ModdleElement) =>
      is(definition, 'bpmn:TimerEventDefinition'),
    );
    if (!hasTimer) {
      report(
        `${label} has no bpmn:timerEventDefinition; the engines refuse the file`,
        ['eventDefinitions'],
        ERROR_TYPES.CHILD_ELEMENT_OF_TYPE_REQUIRED,
        { requiredType: 'bpmn:TimerEventDefinition' },
      );
    }
    if (listener.get('id') === undefined) {
      report(
        `${label} has no id, which the engines require on timeout task listeners; they refuse the file`,
        ['id'],
        ERROR_TYPES.PROPERTY_REQUIRED,
        { requiredProperty: 'id' },
      );
    }
  }

  private hasImplementation(listener: ModdleElement): boolean {
    return (
      IMPLEMENTATIONS.some((name) => this.nonEmpty(listener.get(name))) ||
      listener.script !== undefined
    );
  }

  private nonEmpty(text: unknown): boolean {
    return typeof text === 'string' && text.trim() !== '';
  }
}

export default defineRule(
  { ruleName: 'c7-listener', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7Listener,
);
