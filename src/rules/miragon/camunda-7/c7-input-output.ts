import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7Host } from '../../../lib/engine/c7-extensions/C7Host';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports camunda:inputOutput where the Camunda 7 engines refuse it: on a start or boundary event,
 * a gateway or an event sub-process, and output parameters on an end event or a multi-instance
 * activity.
 */
class C7InputOutput extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): boolean | void {
    if (!C7Host.visits(node)) {
      return false;
    }
    if (!is(node, 'bpmn:FlowNode') || !C7Host.isExecutable(node)) {
      return;
    }
    const host = new C7Host(node);
    const mappings = host.camundaExtensions('inputOutput');
    const [first] = mappings;
    if (!first) {
      return;
    }
    const unsupported = this.unsupportedHost(node);
    if (unsupported) {
      host.report(reporter, {
        message: `camunda:inputOutput on ${host.describe()}: the engines do not support input/output mappings on ${unsupported} and refuse the file`,
        path: host.extensionPath(first.index),
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: first.value,
        extensionElement: first.value,
      });
      return;
    }
    const withOutputs = mappings.find(({ value }) => (value.get('outputParameters') ?? []).length);
    if (!withOutputs) {
      return;
    }
    const message = is(node, 'bpmn:EndEvent')
      ? `camunda:outputParameter on end event ${node.id}: the engines refuse output mappings on end events`
      : this.isMultiInstance(node)
        ? `camunda:outputParameter on multi-instance ${host.describe()}: the engines refuse output mappings on multi-instance activities`
        : undefined;
    if (message) {
      host.report(reporter, {
        message,
        path: host.extensionPath(withOutputs.index, 'outputParameters'),
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: withOutputs.value,
        property: 'outputParameters',
      });
    }
  }

  private isMultiInstance(node: ModdleElement): boolean {
    const loop = node.loopCharacteristics;
    return !!loop && is(loop, 'bpmn:MultiInstanceLoopCharacteristics');
  }

  /** `a startEvent`, `an event sub-process`; undefined where the engines take mappings. */
  private unsupportedHost(node: ModdleElement): string | undefined {
    if (is(node, 'bpmn:SubProcess') && node.triggeredByEvent === true) {
      return 'an event sub-process';
    }
    if (is(node, 'bpmn:StartEvent') || is(node, 'bpmn:BoundaryEvent') || is(node, 'bpmn:Gateway')) {
      const typeName = String(node.$type).replace(/^bpmn:/, '');
      return `a ${typeName.charAt(0).toLowerCase()}${typeName.slice(1)}`;
    }
    return undefined;
  }
}

export default defineRule(
  { ruleName: 'c7-input-output', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7InputOutput,
);
