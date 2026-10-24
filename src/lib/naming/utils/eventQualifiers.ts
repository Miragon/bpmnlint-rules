import type { ModdleElement } from '../../moddle';

const EVENT_DEFINITION_SUFFIX = 'EventDefinition';

/** `bpmn:TimerEventDefinition` -> `timer`. Returns `null` for anything not an event definition. */
function qualifierOf(definition: ModdleElement): string | null {
  const type: string = definition.$type ?? '';
  const local = type.slice(type.indexOf(':') + 1);

  if (!local.endsWith(EVENT_DEFINITION_SUFFIX) || local.length === EVENT_DEFINITION_SUFFIX.length) {
    return null;
  }

  const name = local.slice(0, -EVENT_DEFINITION_SUFFIX.length);
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** The distinct event-definition qualifiers an element carries, e.g. `['message']`. */
export function eventQualifiers(node: ModdleElement): string[] {
  const definitions: ModdleElement[] = node.eventDefinitions ?? [];
  const qualifiers = definitions
    .map(qualifierOf)
    .filter((qualifier): qualifier is string => qualifier !== null);
  return [...new Set(qualifiers)];
}

/** `qualify('timer', 'startEvent_')` -> `timerStartEvent_` (trailing separator preserved). */
export function qualify(qualifier: string, prefix: string): string {
  return `${qualifier}${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}`;
}
