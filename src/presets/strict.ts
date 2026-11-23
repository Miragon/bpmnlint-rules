/**
 * The opt-in "everything Miragon on" preset: the structural base plus every Miragon rule at
 * `error` (`plugin:@miragon/rules/strict`), except the cosmetic `text-annotation-fit`, which is off in
 * every preset. Engine layers are deliberately not included — a config
 * targets one engine at a time via `getDefaultLintConfig({ engine })`.
 */
import { frozenConfig } from '../core/utils/frozenConfig';
import { MIRAGON_NAME } from '../rules/miragon';

export const strict = frozenConfig({
  extends: ['bpmnlint:recommended', `plugin:${MIRAGON_NAME}/strict`],
});
