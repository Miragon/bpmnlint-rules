import { is } from 'bpmnlint-utils';

import type { ModdleElement } from '../../moddle';
import { describeElement } from '../utils/describe';
import { C7EventDefinitions } from './C7EventDefinitions';

/**
 * How a report about one event definition names and addresses it: on its event (with an id) as
 * `Conditional event X`, or among several definitions as `The conditional definition of <event>`;
 * on the definition itself when no event with an id holds it.
 */
export class C7DefinitionSubject {
  private readonly event: ModdleElement | undefined;

  constructor(private readonly definition: ModdleElement) {
    const parent = definition.$parent;
    this.event = parent && is(parent, 'bpmn:Event') && parent.id ? parent : undefined;
  }

  /** The element the report is on. */
  get target(): ModdleElement {
    return this.event ?? this.definition;
  }

  /** The event that holds the definition, `null` when the report is on the definition itself. */
  get parentNode(): ModdleElement | null {
    return this.event ?? null;
  }

  /** The subject of the message; `single` names the kind of a one-definition event (`Link event`). */
  name(single: string): string {
    const event = this.event;
    if (!event) {
      return `${this.definition.$type}${this.definition.id ? ` ${this.definition.id}` : ''}`;
    }
    const definitions = new C7EventDefinitions(event);
    if (definitions.all().length > 1) {
      return `The ${C7EventDefinitions.triggerName(this.definition)} definition of ${describeElement(event)}`;
    }
    return `${single} ${event.id}`;
  }

  /** The report path from the target to the definition's `rest`. */
  path(...rest: string[]): (string | number)[] {
    return this.event ? new C7EventDefinitions(this.event).pathTo(this.definition, ...rest) : rest;
  }
}
