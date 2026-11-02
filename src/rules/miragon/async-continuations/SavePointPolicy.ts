import type { Expectation, SavePointKey, Slot, SlotExpectations } from './SavePointDefaults';
import { SAVE_POINT_DEFAULTS } from './SavePointDefaults';
import { SAVE_POINT_REASONS } from './SavePointReasons';

export type SavePointConfig = { preset?: 'recommended' | 'minimal' } & Partial<
  Record<SavePointKey, Partial<Record<Slot, Expectation>> | false>
>;

const PRESETS = ['recommended', 'minimal'];
const SLOTS: Slot[] = ['before', 'after'];
const EXPECTATIONS: Expectation[] = ['required', 'allowed', 'forbidden'];
const DOCS_URL =
  'https://github.com/Miragon/bpmnlint-rules/blob/main/docs/rules/async-continuations.md#configuration';

/**
 * What the configured policy expects for one slot of one key. A key set to `false` allows both
 * slots, a slot set in the config wins, and otherwise the default applies, where `minimal` turns
 * a default `allowed` into `forbidden`. An unknown option or value throws, so a stale or mistyped
 * config fails loudly instead of silently falling back to the defaults.
 */
export class SavePointPolicy {
  constructor(private readonly config: SavePointConfig = {}) {
    Object.entries(config).forEach(([option, value]) => this.validate(option, value));
  }

  expectationFor(key: SavePointKey, slot: Slot): Expectation | undefined {
    const defaultExpectation = this.defaultOf(key)[slot];
    const keyConfig = this.config[key];

    if (!defaultExpectation) {
      return undefined;
    }
    if (keyConfig === false) {
      return 'allowed';
    }
    return keyConfig?.[slot] ?? this.applyPreset(defaultExpectation);
  }

  /**
   * The default's reason, or `undefined` once the policy expects something else for the slot.
   */
  defaultReasonFor(key: SavePointKey, slot: Slot, expectation: Expectation): string | undefined {
    const isDefaultExpectation = expectation === this.defaultOf(key)[slot];
    return isDefaultExpectation ? SAVE_POINT_REASONS[slot][key] : undefined;
  }

  private validate(option: string, value: unknown): void {
    const isValid =
      option === 'preset'
        ? PRESETS.includes(value as string)
        : Object.hasOwn(SAVE_POINT_DEFAULTS, option) && this.isKeyConfig(value);
    if (!isValid) {
      throw new Error(
        `async-continuations: invalid option ${option}: ${JSON.stringify(value)}. See ${DOCS_URL}`,
      );
    }
  }

  private isKeyConfig(value: unknown): boolean {
    if (value === false) {
      return true;
    }
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    return Object.entries(value).every(
      ([slot, expectation]) =>
        SLOTS.includes(slot as Slot) && EXPECTATIONS.includes(expectation as Expectation),
    );
  }

  private defaultOf(key: SavePointKey): SlotExpectations {
    return SAVE_POINT_DEFAULTS[key];
  }

  private applyPreset(defaultExpectation: Expectation): Expectation {
    const isMinimal = this.config.preset === 'minimal';
    return isMinimal && defaultExpectation === 'allowed' ? 'forbidden' : defaultExpectation;
  }
}
