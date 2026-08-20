/**
 * The opt-in "everything Miragon on" preset: the structural base plus every Miragon rule at
 * `error` (`plugin:@miragon/rules/all`). Engine layers are deliberately not included — a config
 * targets one engine at a time via `getDefaultLintConfig({ engine })`.
 */
import type { BpmnlintConfig } from '../lib/bpmnlint-config';
import { MIRAGON_NAME } from '../rules/miragon';

export const all: BpmnlintConfig = {
  extends: ['bpmnlint:recommended', `plugin:${MIRAGON_NAME}/all`],
};
