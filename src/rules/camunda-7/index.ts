/**
 * The Camunda 7 engine layer — every versioned `camunda-platform-*` config of
 * `bpmnlint-plugin-camunda-compat` (`camunda-platform-7-19` to `camunda-platform-7-24`). They all
 * reference exactly one rule module (`history-time-to-live`).
 *
 * Like the C8 folder, this only enumerates the configs' referenced module and maps it to the
 * resolver cache key; the rule body is camunda-compat's. Kept honest by the camunda-sync spec.
 */
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json';
import camundaCompat from 'bpmnlint-plugin-camunda-compat';

import type { ResolverEntries } from '../../core/bpmnlint-config';

import rule_history_time_to_live from 'bpmnlint-plugin-camunda-compat/rules/camunda-platform/history-time-to-live.js';

const PLUGIN = 'bpmnlint-plugin-camunda-compat';
const FAMILY = 'camunda-platform';
const CONFIG = 'camunda-platform-7-24';

/**
 * The pinned camunda-compat config this layer targets. Deliberately explicit (not auto-latest) so a
 * dependency bump never silently moves the engine target — `test/rules/camunda-sync.spec.ts` fails
 * when camunda-compat ships a newer `camunda-platform-7-*`, turning "time to bump" into a red CI.
 */
export const configName = CONFIG;

/** The prefix of every C7 config name, followed by `-<major>-<minor>`. */
export const configFamily = FAMILY;

/** Every versioned C7 config this layer bundles, from `camunda-platform-7-19` on. */
export const configNames = Object.keys(camundaCompat.configs).filter((name) =>
  name.startsWith(`${FAMILY}-`),
);

/** The moddle extension the C7 rules read (`camunda:` typed properties). */
export const moddleExtension = { prefix: 'camunda', descriptor: camundaModdle };

/** The C7 deployability rule-set (the camunda-compat shareable config). */
export const camunda7Rules = camundaCompat.configs[CONFIG];

export const resolverEntries: ResolverEntries = {
  ...Object.fromEntries(
    configNames.map((name) => [`config:${PLUGIN}/${name}`, camundaCompat.configs[name]]),
  ),
  [`rule:${PLUGIN}/history-time-to-live`]: rule_history_time_to_live,
};
