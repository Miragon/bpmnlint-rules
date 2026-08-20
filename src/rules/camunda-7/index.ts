/**
 * The Camunda 7 engine layer — `bpmnlint-plugin-camunda-compat`'s `camunda-platform-7-24` config,
 * which references exactly one rule module (`history-time-to-live`).
 *
 * Like the C8 folder, this only enumerates the config's referenced module and maps it to the
 * resolver cache key; the rule body is camunda-compat's. Kept honest by the camunda-sync spec.
 */
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json';
import camundaCompat from 'bpmnlint-plugin-camunda-compat';

import type { ResolverEntries } from '../../lib/bpmnlint-config';

import rule_history_time_to_live from 'bpmnlint-plugin-camunda-compat/rules/camunda-platform/history-time-to-live';

const PLUGIN = 'bpmnlint-plugin-camunda-compat';
const CONFIG = 'camunda-platform-7-24';

/**
 * The pinned camunda-compat config this layer targets. Deliberately explicit (not auto-latest) so a
 * dependency bump never silently moves the engine target — `test/rules/camunda-sync.spec.ts` fails
 * when camunda-compat ships a newer `camunda-platform-7-*`, turning "time to bump" into a red CI.
 */
export const configName = CONFIG;

/** The `extends` entry a C7 config uses. */
export const extendsLayer = `plugin:camunda-compat/${CONFIG}`;

/** The moddle extension the C7 rules read (`camunda:` typed properties). */
export const moddleExtension = { prefix: 'camunda', descriptor: camundaModdle };

/** The C7 deployability rule-set (the camunda-compat shareable config). */
export const camunda7Rules = camundaCompat.configs[CONFIG];

export const resolverEntries: ResolverEntries = {
  [`config:${PLUGIN}/${CONFIG}`]: camundaCompat.configs[CONFIG],
  [`rule:${PLUGIN}/history-time-to-live`]: rule_history_time_to_live,
};
