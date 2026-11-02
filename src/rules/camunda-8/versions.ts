/**
 * camunda-compat's `camunda-cloud-8-<minor>` configs of every engine version, and the rule modules
 * only older configs reference, on top of the latest layer in `index.ts`. Only the `./camunda-8`
 * entry imports this, so the plugin's default export bundles the latest config alone. Kept honest by
 * `test/rules/camunda-sync.spec.ts`.
 */
import camundaCompat from 'bpmnlint-plugin-camunda-compat';

import type { ResolverEntries } from '../../lib/bpmnlint-config';

import rule_collapsed_subprocess from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/collapsed-subprocess.js';
import rule_inclusive_gateway from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/inclusive-gateway.js';
import rule_no_before_all_execution_listener from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-before-all-execution-listener.js';
import rule_no_binding_type from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-binding-type.js';
import rule_no_business_id from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-business-id.js';
import rule_no_cancel_execution_listener from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-cancel-execution-listener.js';
import rule_no_candidate_users from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-candidate-users.js';
import rule_no_execution_listener_headers from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-execution-listener-headers.js';
import rule_no_execution_listeners from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-execution-listeners.js';
import rule_no_job_priority_definition from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-job-priority-definition.js';
import rule_no_priority_definition from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-priority-definition.js';
import rule_no_propagate_all_parent_variables from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-propagate-all-parent-variables.js';
import rule_no_signal_event_sub_process from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-signal-event-sub-process.js';
import rule_no_task_listeners from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-task-listeners.js';
import rule_no_task_schedule from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-task-schedule.js';
import rule_no_version_tag from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-version-tag.js';
import rule_no_zeebe_properties from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-zeebe-properties.js';
import rule_no_zeebe_user_task from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-zeebe-user-task.js';

import { configName, moddleExtension, resolverEntries as latestEntries } from './index';

export { configName, moddleExtension };

const PLUGIN = 'bpmnlint-plugin-camunda-compat';
const CONFIG_PREFIX = 'camunda-cloud-8-';

/** Every `camunda-cloud-8-<minor>` config camunda-compat ships, keyed by `8.<minor>`. */
export const configNamesByVersion: Record<string, string> = Object.fromEntries(
  Object.keys(camundaCompat.configs)
    .filter((name) => name.startsWith(CONFIG_PREFIX))
    .map((name) => [`8.${name.slice(CONFIG_PREFIX.length)}`, name]),
);

export const resolverEntries: ResolverEntries = {
  ...latestEntries,
  ...Object.fromEntries(
    Object.values(configNamesByVersion).map((name) => [
      `config:${PLUGIN}/${name}`,
      camundaCompat.configs[name],
    ]),
  ),
  [`rule:${PLUGIN}/collapsed-subprocess`]: rule_collapsed_subprocess,
  [`rule:${PLUGIN}/inclusive-gateway`]: rule_inclusive_gateway,
  [`rule:${PLUGIN}/no-before-all-execution-listener`]: rule_no_before_all_execution_listener,
  [`rule:${PLUGIN}/no-binding-type`]: rule_no_binding_type,
  [`rule:${PLUGIN}/no-business-id`]: rule_no_business_id,
  [`rule:${PLUGIN}/no-cancel-execution-listener`]: rule_no_cancel_execution_listener,
  [`rule:${PLUGIN}/no-candidate-users`]: rule_no_candidate_users,
  [`rule:${PLUGIN}/no-execution-listener-headers`]: rule_no_execution_listener_headers,
  [`rule:${PLUGIN}/no-execution-listeners`]: rule_no_execution_listeners,
  [`rule:${PLUGIN}/no-job-priority-definition`]: rule_no_job_priority_definition,
  [`rule:${PLUGIN}/no-priority-definition`]: rule_no_priority_definition,
  [`rule:${PLUGIN}/no-propagate-all-parent-variables`]: rule_no_propagate_all_parent_variables,
  [`rule:${PLUGIN}/no-signal-event-sub-process`]: rule_no_signal_event_sub_process,
  [`rule:${PLUGIN}/no-task-listeners`]: rule_no_task_listeners,
  [`rule:${PLUGIN}/no-task-schedule`]: rule_no_task_schedule,
  [`rule:${PLUGIN}/no-version-tag`]: rule_no_version_tag,
  [`rule:${PLUGIN}/no-zeebe-properties`]: rule_no_zeebe_properties,
  [`rule:${PLUGIN}/no-zeebe-user-task`]: rule_no_zeebe_user_task,
};
