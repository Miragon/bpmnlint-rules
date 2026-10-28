import { is } from 'bpmnlint-utils';

import type { ModdleElement } from '../../moddle';
import { C7ExecutableScope } from './C7ExecutableScope';

/**
 * The event definitions of one event as the Camunda 7 engines read them. Of several definitions
 * they act on one, the first kind present in an order fixed per event type (engine-checked, each
 * pair in both XML orders), and do not even parse the others. Where the order is not known, every
 * definition counts as acted on.
 */
export class C7EventDefinitions {
  constructor(private readonly event: ModdleElement) {}

  /** `timer` for a `bpmn:TimerEventDefinition`. */
  static triggerName(definition: ModdleElement): string {
    const local = String(definition.$type)
      .replace(/^[^:]*:/, '')
      .replace(/EventDefinition$/, '');
    return local.charAt(0).toLowerCase() + local.slice(1);
  }

  all(): ModdleElement[] {
    return this.event.eventDefinitions ?? [];
  }

  /** The definition the engines act on when the event has several, else `undefined`. */
  acting(): ModdleElement | undefined {
    const definitions = this.all();
    const order = definitions.length > 1 ? this.actingOrder() : undefined;
    if (!order) {
      return undefined;
    }
    const ranks = definitions.map((definition) =>
      order.findIndex((kind) => is(definition, `bpmn:${kind}EventDefinition`)),
    );
    if (ranks.includes(-1)) {
      return undefined;
    }
    return definitions[ranks.indexOf(Math.min(...ranks))];
  }

  /** The definitions the engines read: the acting one of several, else all. */
  actedOn(): ModdleElement[] {
    const acting = this.acting();
    return acting ? [acting] : this.all();
  }

  /** The first acted-on definition of `type`. */
  ofType(type: string): ModdleElement | undefined {
    return this.actedOn().find((definition) => is(definition, type));
  }

  /** The report path from the event to `definition`, followed by `rest`. */
  pathTo(definition: ModdleElement, ...rest: string[]): (string | number)[] {
    return ['eventDefinitions', this.all().indexOf(definition), ...rest];
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
    if (is(event, 'bpmn:StartEvent') && C7ExecutableScope.isEventSubProcess(event.$parent)) {
      return ['Message', 'Signal', 'Timer', 'Conditional'];
    }
    if (is(event, 'bpmn:StartEvent') && is(event.$parent, 'bpmn:Process')) {
      return ['Timer', 'Message', 'Signal', 'Conditional'];
    }
    return undefined;
  }
}
