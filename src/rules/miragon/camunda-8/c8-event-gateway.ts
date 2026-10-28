import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C8EventPosition } from '../../../lib/engine/c8-events/C8EventPosition';
import { FlowIndex } from '../../../lib/engine/c8-events/FlowIndex';
import { EngineRule } from '../../../lib/engine/EngineRule';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

const GATEWAY_TRIGGERS = [
  'bpmn:MessageEventDefinition',
  'bpmn:TimerEventDefinition',
  'bpmn:SignalEventDefinition',
  'bpmn:ConditionalEventDefinition',
];

/**
 * Reports an event-based gateway Camunda 8 refuses to deploy: one with fewer than two outgoing
 * flows (as the engine counts them, from the gateway's `<bpmn:outgoing>` entries), or one leading
 * to anything but a message, timer, signal or conditional intermediate catch event.
 */
class C8EventGateway extends EngineRule {
  protected readonly engine: Engine = 'c8';
  private readonly flows = new FlowIndex();

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:EventBasedGateway') || !C8EventPosition.isExecutable(node)) {
      return;
    }

    const flows = this.flows.outgoing(node);
    this.checkBranchCount(node, flows, reporter);
    for (const flow of flows) {
      this.checkTarget(node, flow.get('targetRef'), reporter);
    }
  }

  private checkBranchCount(node: ModdleElement, flows: ModdleElement[], reporter: Reporter) {
    const listed = (node.get('outgoing') ?? []).filter(
      (flow: ModdleElement) => flow.get('sourceRef') === node,
    );
    let message: string | undefined;
    if (flows.length < 2) {
      message = `Event-based gateway ${node.id} has ${flows.length} outgoing flow${flows.length === 1 ? '' : 's'}; Camunda 8 needs at least two and refuses the file`;
    } else if (listed.length < 2) {
      message = `Event-based gateway ${node.id} has ${flows.length} outgoing flows, but the file lists ${listed.length} of them as its <bpmn:outgoing> entries; Camunda 8 counts the listed ones and refuses the file`;
    }
    if (!message) {
      return;
    }
    reportErrors(node, reporter, {
      message,
      path: ['outgoing'],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node,
        parentNode: null,
        requiredProperty: 'outgoing',
      },
    });
  }

  /** A receive task after the gateway is camunda-compat's `event-based-gateway-target`. */
  private checkTarget(node: ModdleElement, target: ModdleElement, reporter: Reporter): void {
    if (!target || is(target, 'bpmn:ReceiveTask') || this.isGatewayTrigger(target)) {
      return;
    }
    reportErrors(node, reporter, {
      message: `Event-based gateway ${node.id} leads to ${describeElement(target)}; Camunda 8 allows only message, timer, signal and conditional intermediate catch events after it and refuses the file`,
      path: null,
      data: {
        type: ERROR_TYPES.EVENT_BASED_GATEWAY_TARGET_NOT_ALLOWED,
        node,
        parentNode: null,
        target,
      },
    });
  }

  private isGatewayTrigger(target: ModdleElement): boolean {
    if (!is(target, 'bpmn:IntermediateCatchEvent')) {
      return false;
    }
    const definitions = target.get('eventDefinitions');
    return definitions.length === 1 && GATEWAY_TRIGGERS.some((type) => is(definitions[0], type));
  }
}

export default defineRule(
  { ruleName: 'c8-event-gateway', kind: 'engine-specific', targetEngine: 'c8', impact: 'deploy' },
  C8EventGateway,
);
