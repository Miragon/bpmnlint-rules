import type { BpmnlintConfig } from '../bpmnlint-config';

export function frozenConfig(config: BpmnlintConfig): Readonly<BpmnlintConfig> {
  if (config.rules) {
    Object.freeze(config.rules);
  }
  if (Array.isArray(config.extends)) {
    Object.freeze(config.extends);
  }
  return Object.freeze(config);
}
