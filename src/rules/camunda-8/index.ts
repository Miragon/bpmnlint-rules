/**
 * The Camunda 8 engine layer — `bpmnlint-plugin-camunda-compat`'s `camunda-cloud-8-10` config and
 * every rule module it references.
 *
 * These rule bodies are the camunda-compat plugin's, not ours: this folder only enumerates the
 * modules the config names (as require-path strings a bundler can't follow) and maps them to the
 * resolver cache keys bpmnlint asks for — the per-engine half of the modeler's old
 * `bundledDefaultResolver`. The config also references one bpmnlint built-in
 * (`bpmnlint/start-event-required`); that resolves from the `common` folder, so it is not
 * re-imported here.
 *
 * Kept honest by `test/rules/camunda-sync.spec.ts`: it walks this config's referenced rules and
 * asserts each resolves, so a camunda-compat bump that adds or renames one fails the build.
 */
import zeebeModdle from 'zeebe-bpmn-moddle/resources/zeebe.json';
import camundaCompat from 'bpmnlint-plugin-camunda-compat';

import type { ResolverEntries } from '../../lib/bpmnlint-config';

import rule_ad_hoc_sub_process from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/ad-hoc-sub-process';
import rule_agent_fromai_contract from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/agent-fromai-contract';
import rule_agent_tool_documentation from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/agent-tool-documentation';
import rule_agent_tool_output_key from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/agent-tool-output-key';
import rule_before_all_execution_listener from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/before-all-execution-listener';
import rule_called_element from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/called-element';
import rule_cancel_execution_listener from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/cancel-execution-listener';
import rule_connector_properties from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/connector-properties';
import rule_duplicate_execution_listener_headers from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/duplicate-execution-listener-headers';
import rule_duplicate_execution_listeners from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/duplicate-execution-listeners';
import rule_duplicate_task_headers from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/duplicate-task-headers';
import rule_element_type from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/element-type';
import rule_error_reference from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/error-reference';
import rule_escalation_boundary_event_attached_to_ref from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/escalation-boundary-event-attached-to-ref';
import rule_escalation_reference from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/escalation-reference';
import rule_event_based_gateway_target from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/event-based-gateway-target';
import rule_executable_process from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/executable-process';
import rule_execution_listener from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/execution-listener';
import rule_feel from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/feel';
import rule_feel_compatibility from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/feel-compatibility';
import rule_implementation from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/implementation';
import rule_io_mapping from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/io-mapping';
import rule_link_event from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/link-event';
import rule_loop_characteristics from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/loop-characteristics';
import rule_message_reference from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/message-reference';
import rule_no_expression from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-expression';
import rule_no_interrupting_event_subprocess from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-interrupting-event-subprocess';
import rule_no_loop from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-loop';
import rule_no_multiple_none_start_events from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/no-multiple-none-start-events';
import rule_priority_definition from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/priority-definition';
import rule_secrets from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/secrets';
import rule_sequence_flow_condition from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/sequence-flow-condition';
import rule_signal_reference from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/signal-reference';
import rule_start_event_form from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/start-event-form';
import rule_start_event_form_embedded from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/start-event-form-embedded';
import rule_subscription from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/subscription';
import rule_task_listener from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/task-listener';
import rule_task_schedule from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/task-schedule';
import rule_timer from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/timer';
import rule_user_task_definition from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/user-task-definition';
import rule_user_task_form from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/user-task-form';
import rule_variable_name from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/variable-name';
import rule_version_tag from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/version-tag';
import rule_wait_for_completion from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/wait-for-completion';
import rule_zeebe_user_task from 'bpmnlint-plugin-camunda-compat/rules/camunda-cloud/zeebe-user-task';

const PLUGIN = 'bpmnlint-plugin-camunda-compat';
const CONFIG = 'camunda-cloud-8-10';

/**
 * The pinned camunda-compat config this layer targets. Deliberately explicit (not auto-latest) so a
 * dependency bump never silently moves the engine target — `test/rules/camunda-sync.spec.ts` fails
 * when camunda-compat ships a newer `camunda-cloud-8-*`, turning "time to bump" into a red CI.
 */
export const configName = CONFIG;

/** The `extends` entry a C8 config uses. */
export const extendsLayer = `plugin:camunda-compat/${CONFIG}`;

/** The moddle extension the C8 rules read (`zeebe:` typed properties). */
export const moddleExtension = { prefix: 'zeebe', descriptor: zeebeModdle };

/** The C8 deployability rule-set (the camunda-compat shareable config). */
export const camunda8Rules = camundaCompat.configs[CONFIG];

export const resolverEntries: ResolverEntries = {
  [`config:${PLUGIN}/${CONFIG}`]: camundaCompat.configs[CONFIG],
  [`rule:${PLUGIN}/ad-hoc-sub-process`]: rule_ad_hoc_sub_process,
  [`rule:${PLUGIN}/agent-fromai-contract`]: rule_agent_fromai_contract,
  [`rule:${PLUGIN}/agent-tool-documentation`]: rule_agent_tool_documentation,
  [`rule:${PLUGIN}/agent-tool-output-key`]: rule_agent_tool_output_key,
  [`rule:${PLUGIN}/before-all-execution-listener`]: rule_before_all_execution_listener,
  [`rule:${PLUGIN}/called-element`]: rule_called_element,
  [`rule:${PLUGIN}/cancel-execution-listener`]: rule_cancel_execution_listener,
  [`rule:${PLUGIN}/connector-properties`]: rule_connector_properties,
  [`rule:${PLUGIN}/duplicate-execution-listener-headers`]:
    rule_duplicate_execution_listener_headers,
  [`rule:${PLUGIN}/duplicate-execution-listeners`]: rule_duplicate_execution_listeners,
  [`rule:${PLUGIN}/duplicate-task-headers`]: rule_duplicate_task_headers,
  [`rule:${PLUGIN}/element-type`]: rule_element_type,
  [`rule:${PLUGIN}/error-reference`]: rule_error_reference,
  [`rule:${PLUGIN}/escalation-boundary-event-attached-to-ref`]:
    rule_escalation_boundary_event_attached_to_ref,
  [`rule:${PLUGIN}/escalation-reference`]: rule_escalation_reference,
  [`rule:${PLUGIN}/event-based-gateway-target`]: rule_event_based_gateway_target,
  [`rule:${PLUGIN}/executable-process`]: rule_executable_process,
  [`rule:${PLUGIN}/execution-listener`]: rule_execution_listener,
  [`rule:${PLUGIN}/feel`]: rule_feel,
  [`rule:${PLUGIN}/feel-compatibility`]: rule_feel_compatibility,
  [`rule:${PLUGIN}/implementation`]: rule_implementation,
  [`rule:${PLUGIN}/io-mapping`]: rule_io_mapping,
  [`rule:${PLUGIN}/link-event`]: rule_link_event,
  [`rule:${PLUGIN}/loop-characteristics`]: rule_loop_characteristics,
  [`rule:${PLUGIN}/message-reference`]: rule_message_reference,
  [`rule:${PLUGIN}/no-expression`]: rule_no_expression,
  [`rule:${PLUGIN}/no-interrupting-event-subprocess`]: rule_no_interrupting_event_subprocess,
  [`rule:${PLUGIN}/no-loop`]: rule_no_loop,
  [`rule:${PLUGIN}/no-multiple-none-start-events`]: rule_no_multiple_none_start_events,
  [`rule:${PLUGIN}/priority-definition`]: rule_priority_definition,
  [`rule:${PLUGIN}/secrets`]: rule_secrets,
  [`rule:${PLUGIN}/sequence-flow-condition`]: rule_sequence_flow_condition,
  [`rule:${PLUGIN}/signal-reference`]: rule_signal_reference,
  [`rule:${PLUGIN}/start-event-form`]: rule_start_event_form,
  [`rule:${PLUGIN}/start-event-form-embedded`]: rule_start_event_form_embedded,
  [`rule:${PLUGIN}/subscription`]: rule_subscription,
  [`rule:${PLUGIN}/task-listener`]: rule_task_listener,
  [`rule:${PLUGIN}/task-schedule`]: rule_task_schedule,
  [`rule:${PLUGIN}/timer`]: rule_timer,
  [`rule:${PLUGIN}/user-task-definition`]: rule_user_task_definition,
  [`rule:${PLUGIN}/user-task-form`]: rule_user_task_form,
  [`rule:${PLUGIN}/variable-name`]: rule_variable_name,
  [`rule:${PLUGIN}/version-tag`]: rule_version_tag,
  [`rule:${PLUGIN}/wait-for-completion`]: rule_wait_for_completion,
  [`rule:${PLUGIN}/zeebe-user-task`]: rule_zeebe_user_task,
};
