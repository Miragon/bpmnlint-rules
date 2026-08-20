/**
 * The engine-agnostic, ready-to-use preset: the structural base plus the Miragon opinion layer.
 *
 * Distinct from the plugin's own `plugin:@miragon/rules/recommended` shareable config (which is the
 * Miragon layer *alone*): this preset already pulls in `bpmnlint:recommended`, so a consumer can
 * drop it into a `.bpmnlintrc` as-is. For engine-specific defaults use `getDefaultLintConfig`.
 */
import type { BpmnlintConfig } from '../lib/bpmnlint-config';
import { MIRAGON_NAME } from '../rules/miragon';

export const recommended: BpmnlintConfig = {
  extends: ['bpmnlint:recommended', `plugin:${MIRAGON_NAME}/recommended`],
};
