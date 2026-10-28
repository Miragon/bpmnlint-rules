/**
 * The Camunda 7 engine layer: `bpmnlint-plugin-camunda-compat`'s `camunda-platform-7-<minor>`
 * configs, which all reference exactly one rule module (`history-time-to-live`).
 *
 * Like the C8 folder, this only enumerates the configs' referenced module and maps it to the
 * resolver cache key; the rule body is camunda-compat's. Kept honest by the camunda-sync spec.
 */
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json';
import camundaCompat from 'bpmnlint-plugin-camunda-compat';

import type { ResolverEntries } from '../../lib/bpmnlint-config';

import rule_history_time_to_live from 'bpmnlint-plugin-camunda-compat/rules/camunda-platform/history-time-to-live.js';

const PLUGIN = 'bpmnlint-plugin-camunda-compat';
const CONFIG = 'camunda-platform-7-24';
const CONFIG_PREFIX = 'camunda-platform-7-';

/**
 * The newest camunda-compat config, the target of a diagram without an engine version. Pinned (not
 * auto-latest) so a dependency bump never silently moves the default target: `camunda-sync.spec.ts`
 * fails when camunda-compat ships a newer `camunda-platform-7-*`, turning "time to bump" into a red CI.
 */
export const configName = CONFIG;

/** Every `camunda-platform-7-<minor>` config camunda-compat ships, keyed by `7.<minor>`. */
export const configNamesByVersion: Record<string, string> = Object.fromEntries(
  Object.keys(camundaCompat.configs)
    .filter((name) => name.startsWith(CONFIG_PREFIX))
    .map((name) => [`7.${name.slice(CONFIG_PREFIX.length)}`, name]),
);

/** The moddle extension the C7 rules read (`camunda:` typed properties). */
export const moddleExtension = { prefix: 'camunda', descriptor: camundaModdle };

/** The C7 deployability rule-set for the latest version (the camunda-compat shareable config). */
export const camunda7Rules = camundaCompat.configs[CONFIG];

export const resolverEntries: ResolverEntries = {
  ...Object.fromEntries(
    Object.values(configNamesByVersion).map((name) => [
      `config:${PLUGIN}/${name}`,
      camundaCompat.configs[name],
    ]),
  ),
  [`rule:${PLUGIN}/history-time-to-live`]: rule_history_time_to_live,
};
