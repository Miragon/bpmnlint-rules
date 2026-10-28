import { is } from 'bpmnlint-utils';

import { CamundaDescriptor } from './CamundaDescriptor';
import type { C7Host, HostExtension } from './C7Host';
import { kindsText } from './utils/kindsText';

/**
 * Content of an event definition the engines read on one side only (the descriptor allows it on
 * both): delegate settings on message throw events, async and camunda:in on signal throw events,
 * the code variables on error and escalation catch events.
 */
const SIDE_RULES: Array<{
  definition: string;
  side: 'throw' | 'catch';
  attributes: string[];
  extensions: string[];
  where: string;
}> = [
  {
    definition: 'bpmn:MessageEventDefinition',
    side: 'throw',
    attributes: [
      'class',
      'delegateExpression',
      'expression',
      'resultVariable',
      'type',
      'topic',
      'taskPriority',
    ],
    extensions: ['field', 'connector'],
    where: 'message throw and end events',
  },
  {
    definition: 'bpmn:SignalEventDefinition',
    side: 'throw',
    attributes: ['async'],
    extensions: ['in'],
    where: 'signal throw and end events',
  },
  {
    definition: 'bpmn:ErrorEventDefinition',
    side: 'catch',
    attributes: ['errorCodeVariable', 'errorMessageVariable'],
    extensions: [],
    where: 'error boundary and error start events',
  },
  {
    definition: 'bpmn:EscalationEventDefinition',
    side: 'catch',
    attributes: ['escalationCodeVariable'],
    extensions: [],
    where: 'escalation boundary and escalation start events',
  },
];

/** Whether the Camunda 7 engines read camunda content where a host carries it. */
export class CamundaPlacement {
  private readonly descriptor = CamundaDescriptor.get();

  constructor(private readonly host: C7Host) {}

  /** The camunda attributes the descriptor allows on the host's event definition but the engines read on the other side only. */
  static sideAttributes(): string[] {
    return SIDE_RULES.flatMap((rule) => rule.attributes);
  }

  /**
   * Where the engines read the attribute or extension element `local` instead, when the host is an
   * event definition on the side of its event that ignores it; undefined otherwise.
   */
  wrongSide(local: string, kind: 'attributes' | 'extensions'): string | undefined {
    const { node, owner } = this.host;
    if (!owner || !(owner.eventDefinitions ?? []).includes(node)) {
      return undefined;
    }
    const side = is(owner, 'bpmn:CatchEvent')
      ? 'catch'
      : is(owner, 'bpmn:ThrowEvent')
        ? 'throw'
        : undefined;
    if (!side) {
      return undefined;
    }
    const rule = SIDE_RULES.find(
      (sideRule) => is(node, sideRule.definition) && sideRule[kind].includes(local),
    );
    return rule && rule.side !== side ? rule.where : undefined;
  }

  /** Why the engines ignore the camunda extension element where it sits; undefined when they read it. */
  misplacement(extension: HostExtension): string | undefined {
    const { local } = extension;
    const where = this.host.describe();
    const side = this.wrongSide(local, 'extensions');
    if (side) {
      return `camunda:${local} on ${where} has no effect: the engines read it on ${side} only`;
    }
    if (this.descriptor.isReadOn(local, this.host.node)) {
      return undefined;
    }
    const containers = this.descriptor.isNestedOnly(local)
      ? this.descriptor.containersOf(local)
      : [];
    return containers.length
      ? `camunda:${local} sits directly in the extension elements of ${where}, but belongs inside ${containers.join(' / ')}; the engines ignore it`
      : `camunda:${local} on ${where} has no effect: the engines read it on ${kindsText(this.descriptor.hostsOf(local))} only`;
  }

  /** The camunda extension elements the engines read where they sit. */
  readExtensions(local?: string): HostExtension[] {
    return this.host
      .camundaExtensions(local)
      .filter((extension) => this.misplacement(extension) === undefined);
  }
}
