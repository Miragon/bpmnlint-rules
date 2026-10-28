import { is } from 'bpmnlint-utils';

import type { ModdleElement } from '../../moddle';

/** An event definition the engines read, with its index in `eventDefinitions`. */
interface ActedDefinition {
  definition: ModdleElement;
  index: number;
}

/**
 * The event definitions Camunda 7 reads on an event. Of several, the engines act on the first kind
 * of an order known per event type and do not parse the others; where the order is not known,
 * every definition counts.
 */
export class ActedEventDefinitions {
  constructor(private readonly event: ModdleElement) {}

  /** The read definitions of `type` (`bpmn:MessageEventDefinition`). */
  ofType(type: string): ActedDefinition[] {
    return this.all().filter(({ definition }) => is(definition, type));
  }

  private all(): ActedDefinition[] {
    const definitions: ModdleElement[] = this.event.get('eventDefinitions') ?? [];
    const indexed = definitions.map((definition, index) => ({ definition, index }));
    const order = definitions.length > 1 ? this.actingOrder() : undefined;
    if (!order) {
      return indexed;
    }
    const ranks = definitions.map((definition) =>
      order.findIndex((kind) => is(definition, `bpmn:${kind}EventDefinition`)),
    );
    if (ranks.includes(-1)) {
      return indexed;
    }
    const acting = ranks.indexOf(Math.min(...ranks));
    return indexed.filter(({ index }) => index === acting);
  }

  private actingOrder(): string[] | undefined {
    const event = this.event;
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
    if (is(event, 'bpmn:StartEvent')) {
      return this.startEventOrder(event.$parent);
    }
    return undefined;
  }

  private startEventOrder(scope: ModdleElement): string[] | undefined {
    if (is(scope, 'bpmn:SubProcess') && scope.get('triggeredByEvent') === true) {
      return ['Message', 'Signal', 'Timer', 'Conditional'];
    }
    if (is(scope, 'bpmn:Process')) {
      return ['Timer', 'Message', 'Signal', 'Conditional'];
    }
    return undefined;
  }
}
