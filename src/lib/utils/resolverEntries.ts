import type { BpmnlintConfig, ResolverEntries } from '../bpmnlint-config';
import { MIRAGON_PLUGIN } from '../plugin-names';

/** The StaticResolver cache keys of Miragon configs and rules: `config:<plugin>/<name>`, `rule:<plugin>/<name>`. */
export function miragonResolverEntries(
  layers: Record<string, BpmnlintConfig>,
  ruleFactories: Record<string, unknown>,
): ResolverEntries {
  return {
    ...Object.fromEntries(
      Object.entries(layers).map(([layerName, layer]) => [
        `config:${MIRAGON_PLUGIN}/${layerName}`,
        layer,
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(ruleFactories).map(([name, factory]) => [
        `rule:${MIRAGON_PLUGIN}/${name}`,
        factory,
      ]),
    ),
  };
}
