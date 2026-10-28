import type { ModdleElement } from '../../../moddle';

/** A FEEL expression: the value starts with `=`. */
export function isFeel(value: unknown): value is string {
  return typeof value === 'string' && value.trim().startsWith('=');
}

/** No value at all: Camunda 8 refuses a missing or empty name or code, but not one of white space. */
export function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/** No value or only white space. */
export function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

/** `message`, `timer`, ... of an event definition. */
export function triggerName(definition: ModdleElement): string {
  const local = String(definition.$type)
    .replace(/^[^:]*:/, '')
    .replace(/EventDefinition$/, '');
  return local.charAt(0).toLowerCase() + local.slice(1);
}
