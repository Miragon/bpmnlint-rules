import type { ModdleElement } from '../../moddle';

/**
 * How an engine message names an element: `serviceTask Activity_1`, or for an element without an
 * id `the multiInstanceLoopCharacteristics of serviceTask Activity_1`.
 */
export function describeElement(el: ModdleElement, owner?: ModdleElement): string {
  const local = String(el.$type ?? '').replace(/^[^:]*:/, '');
  const kind = local.charAt(0).toLowerCase() + local.slice(1);
  if (el.id) {
    return `${kind} ${el.id}`;
  }
  return owner ? `the ${kind} of ${describeElement(owner)}` : kind;
}
