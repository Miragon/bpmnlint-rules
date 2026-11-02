import type { ModdleElement } from '../moddle';
import type { Slot } from './SavePointDefaults';

/**
 * The `camunda:asyncBefore` / `camunda:asyncAfter` flag behind a slot.
 */
export class SavePointFlag {
  /**
   * Is the flag of `slot` set? The legacy `camunda:async` counts as `asyncBefore`.
   */
  static isSet(flagOwner: ModdleElement, slot: Slot): boolean {
    if (slot === 'after') {
      return this.isTrue(flagOwner.get('camunda:asyncAfter'));
    }
    return (
      this.isTrue(flagOwner.get('camunda:asyncBefore')) ||
      this.isTrue(flagOwner.get('camunda:async'))
    );
  }

  static nameOf(slot: Slot): string {
    return slot === 'before' ? 'camunda:asyncBefore' : 'camunda:asyncAfter';
  }

  private static isTrue(value: unknown): boolean {
    return value === true || value === 'true';
  }
}
