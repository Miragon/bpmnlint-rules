/**
 * The engine-agnostic, ready-to-use presets: the structural base plus a Miragon opinion layer.
 *
 * Distinct from the plugin's own `plugin:@miragon/rules/recommended-for-*` shareable configs (which
 * are the Miragon layer *alone*): these presets already pull in `bpmnlint:recommended`, so a
 * consumer can drop one into a `.bpmnlintrc` as-is. For engine-specific defaults use
 * `getDefaultLintConfig`.
 *
 * Pick by intent: {@link recommendedForModeling} for hand-drawn, human-facing diagrams (layout at
 * `warn`, id conventions off); {@link recommendedForAutomation} for executable processes (every
 * Miragon rule at `error`).
 */
import type { BpmnlintConfig } from '../lib/bpmnlint-config';
import { MIRAGON_NAME } from '../rules/miragon';

export const recommendedForModeling: BpmnlintConfig = {
  extends: ['bpmnlint:recommended', `plugin:${MIRAGON_NAME}/recommended-for-modeling`],
};

export const recommendedForAutomation: BpmnlintConfig = {
  extends: ['bpmnlint:recommended', `plugin:${MIRAGON_NAME}/recommended-for-automation`],
};
