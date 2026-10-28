import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7ActedOnDefinitions } from '../../../lib/engine/c7-flows/C7ActedOnDefinitions';
import { C7FlowGraph } from '../../../lib/engine/c7-flows/C7FlowGraph';
import { C7FlowRule } from '../../../lib/engine/c7-flows/C7FlowRule';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

const WAITING_TRIGGERS = ['message', 'timer', 'signal', 'conditional'];

const REFERENCE_BY_TRIGGER: Record<string, string> = { message: 'messageRef', signal: 'signalRef' };

/**
 * Reports an event-based gateway Camunda 7 refuses to deploy: a branch that is not a message,
 * timer, signal or conditional intermediate catch event, a catch event with other incoming flows,
 * or two branches waiting for the same message or signal name.
 */
class C7EventGateway extends C7FlowRule {
  protected checkRunElement(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:EventBasedGateway')) {
      return;
    }
    const graph = C7FlowGraph.forElement(node);
    const branchByName = new Map<string, ModdleElement>();
    for (const flow of graph.outgoing(node)) {
      const target = flow.targetRef;
      if (!target) {
        continue;
      }
      const definition = this.waitingDefinition(node, reporter, flow, target);
      if (!definition) {
        continue;
      }
      if (graph.incoming(target).length > 1) {
        this.report(
          node,
          reporter,
          `${describeElement(target)} after event-based gateway ${node.id} has other incoming flows; the engines refuse the file`,
          { type: ERROR_TYPES.PROPERTY_NOT_ALLOWED, node: target, property: 'incoming' },
        );
      }
      this.checkDuplicateName(node, reporter, branchByName, target, definition);
    }
  }

  /** The one definition the target waits for, or `undefined` after reporting a target the engines refuse. */
  private waitingDefinition(
    node: ModdleElement,
    reporter: Reporter,
    flow: ModdleElement,
    target: ModdleElement,
  ): ModdleElement | undefined {
    const leadsTo = `Event-based gateway ${node.id} leads to ${describeElement(target)}`;
    const refused = {
      type: ERROR_TYPES.EVENT_BASED_GATEWAY_TARGET_NOT_ALLOWED,
      node: target,
      sequenceFlow: flow,
    };
    if (!is(target, 'bpmn:IntermediateCatchEvent')) {
      this.report(
        node,
        reporter,
        `${leadsTo}; the engines accept only intermediate catch events (message, timer, signal, conditional) there and refuse the file`,
        refused,
      );
      return undefined;
    }
    const definitions = new C7ActedOnDefinitions(target).list();
    const [definition] = definitions;
    if (definitions.length !== 1 || !WAITING_TRIGGERS.includes(this.triggerOf(definition))) {
      this.report(
        node,
        reporter,
        `${leadsTo}; after an event-based gateway the engines accept only message, timer, signal and conditional catch events and refuse the file`,
        refused,
      );
      return undefined;
    }
    return definition;
  }

  private checkDuplicateName(
    node: ModdleElement,
    reporter: Reporter,
    branchByName: Map<string, ModdleElement>,
    target: ModdleElement,
    definition: ModdleElement,
  ): void {
    const trigger = this.triggerOf(definition);
    const referenceProperty = REFERENCE_BY_TRIGGER[trigger];
    const name = referenceProperty ? definition.get(referenceProperty)?.name : undefined;
    if (!referenceProperty || !name) {
      return;
    }
    const key = `${trigger}\u0000${name}`;
    const first = branchByName.get(key);
    if (!first) {
      branchByName.set(key, target);
      return;
    }
    this.report(
      node,
      reporter,
      `Branches ${first.id} and ${target.id} of event-based gateway ${node.id} wait for the same ${trigger} "${name}"; the engines refuse the file`,
      {
        type: ERROR_TYPES.ELEMENT_PROPERTY_VALUE_DUPLICATED,
        node: definition,
        duplicatedProperty: referenceProperty,
        duplicatedPropertyValue: name,
      },
    );
  }

  /** The finding is on a branch, no property of the gateway: the path is null. */
  private report(
    node: ModdleElement,
    reporter: Reporter,
    message: string,
    details: { type: string; [key: string]: unknown },
  ): void {
    reportErrors(node, reporter, {
      message,
      path: null,
      data: { parentNode: node, ...details },
    });
  }

  /** `timer` for a `bpmn:TimerEventDefinition`. */
  private triggerOf(definition: ModdleElement): string {
    const local = String(definition?.$type ?? '')
      .replace(/^[^:]*:/, '')
      .replace(/EventDefinition$/, '');
    return local.charAt(0).toLowerCase() + local.slice(1);
  }
}

export default defineRule(
  { ruleName: 'c7-event-gateway', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7EventGateway,
);
