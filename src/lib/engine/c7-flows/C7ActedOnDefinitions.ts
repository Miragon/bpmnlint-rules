import { is } from 'bpmnlint-utils';

import type { ModdleElement } from '../../moddle';

/**
 * The event definitions of one event the Camunda 7 engines read. Of several definitions they act
 * on one, the first kind present in an order fixed per event type, and do not parse the others.
 * Where the order is not known, every definition is read.
 */
export class C7ActedOnDefinitions {
  constructor(private readonly event: ModdleElement) {}

  all(): ModdleElement[] {
    return this.event.eventDefinitions ?? [];
  }

  /** The acting definition of several, else every definition. */
  list(): ModdleElement[] {
    const definitions = this.all();
    const order = definitions.length > 1 ? this.actingOrder() : undefined;
    if (!order) {
      return definitions;
    }
    const ranks = definitions.map((definition) =>
      order.findIndex((kind) => is(definition, `bpmn:${kind}EventDefinition`)),
    );
    if (ranks.includes(-1)) {
      return definitions;
    }
    return [definitions[ranks.indexOf(Math.min(...ranks))]];
  }

  private actingOrder(): string[] | undefined {
    const event = this.event;
    const parent = event.$parent;
    if (is(event, 'bpmn:IntermediateCatchEvent')) {
      return ['Timer', 'Signal', 'Message', 'Link', 'Conditional'];
    }
    if (is(event, 'bpmn:BoundaryEvent')) {
      return ['Timer', 'Signal', 'Message', 'Conditional'];
    }
    if (is(event, 'bpmn:IntermediateThrowEvent')) {
      return ['Signal', 'Message'];
    }
    if (is(event, 'bpmn:EndEvent')) {
      return ['Message', 'Signal'];
    }
    if (is(event, 'bpmn:StartEvent') && is(parent, 'bpmn:SubProcess') && parent.triggeredByEvent) {
      return ['Message', 'Signal', 'Timer', 'Conditional'];
    }
    if (is(event, 'bpmn:StartEvent') && is(parent, 'bpmn:Process')) {
      return ['Timer', 'Message', 'Signal', 'Conditional'];
    }
    return undefined;
  }
}
