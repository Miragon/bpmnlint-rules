import { is, isAny } from 'bpmnlint-utils';

import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

export interface AsyncContinuationsConfig {
  serviceTasks?: boolean;
  userTasks?: boolean;
  startEvents?: boolean;
  joins?: boolean;
  multiInstance?: boolean;
  waitStates?: boolean;
}

const CAMUNDA_7_NAMESPACE = 'http://camunda.org/schema/1.0/bpmn';
const CAMUNDA_7_EXECUTION_PLATFORM = 'Camunda Platform';

const REMOTE_CALL_TASKS = ['bpmn:ServiceTask', 'bpmn:ScriptTask', 'bpmn:SendTask'];
const EXTERNAL_CAPABLE_TASKS = ['bpmn:ServiceTask', 'bpmn:SendTask', 'bpmn:BusinessRuleTask'];
const MESSAGE_THROW_EVENTS = ['bpmn:IntermediateThrowEvent', 'bpmn:EndEvent'];
const NATIVE_WAIT_STATES = [
  'bpmn:UserTask',
  'bpmn:ReceiveTask',
  'bpmn:IntermediateCatchEvent',
  'bpmn:EventBasedGateway',
];
const JOIN_GATEWAYS = ['bpmn:ParallelGateway', 'bpmn:InclusiveGateway'];

const MESSAGES = {
  serviceTasks:
    'Add camunda:asyncBefore so a failing call rolls back to this task, not the last wait state',
  userTasks: 'Add camunda:asyncAfter so completing the task commits before the following steps run',
  startEvents: 'Add camunda:asyncBefore so the caller gets the instance back before work starts',
  joins:
    'Add camunda:asyncBefore so joining paths do not collide with an OptimisticLockingException',
  multiInstance:
    'Add camunda:asyncBefore so the instances start in their own transaction, not the caller one',
  waitStates:
    'Remove camunda:asyncBefore: a wait state already commits, the extra job is only overhead',
};

/**
 * Reports Camunda 7 save points that are missing where Camunda's transaction handling best
 * practices ask for one, and `camunda:asyncBefore` flags on elements that are already wait states.
 *
 * Without a save point a failure rolls back to the last wait state: a user's completion is undone,
 * side effects run twice, or the incident shows at the wrong activity. None of that is visible in
 * the modeler.
 *
 * Configuration (all optional, every check defaults to `true`):
 *
 *     "@miragon/rules/camunda-7-async-continuations": [ "error", {
 *       "serviceTasks": true,   // asyncBefore on service, script, send tasks and message throws
 *       "userTasks": true,      // asyncAfter on user tasks
 *       "startEvents": true,    // asyncBefore on process start events
 *       "joins": true,          // asyncBefore on parallel and inclusive joins
 *       "multiInstance": true,  // asyncBefore on multi-instance activities
 *       "waitStates": true      // no asyncBefore on user, receive tasks, catch events, ...
 *     } ]
 *
 * Only Camunda 7 diagrams are checked: `modeler:executionPlatform="Camunda Platform"`, or no
 * execution platform but the `camunda:` namespace declared. External tasks count as wait states.
 */
export default function asyncContinuations(config?: AsyncContinuationsConfig): Rule {
  const {
    serviceTasks = true,
    userTasks = true,
    startEvents = true,
    joins = true,
    multiInstance = true,
    waitStates = true,
  } = config ?? {};

  function isFlagSet(value: unknown): boolean {
    return value === true || value === 'true';
  }

  function hasAsyncBefore(node: ModdleElement): boolean {
    return isFlagSet(node.get('camunda:asyncBefore')) || isFlagSet(node.get('camunda:async'));
  }

  function hasAsyncAfter(node: ModdleElement): boolean {
    return isFlagSet(node.get('camunda:asyncAfter'));
  }

  function definitionsOf(node: ModdleElement): ModdleElement | undefined {
    let current = node;
    while (current && !is(current, 'bpmn:Definitions')) {
      current = current.$parent;
    }
    return current;
  }

  function declaresCamunda7Namespace(definitions: ModdleElement): boolean {
    return Object.entries(definitions.$attrs ?? {}).some(
      ([name, value]) => name.startsWith('xmlns:') && value === CAMUNDA_7_NAMESPACE,
    );
  }

  function isCamunda7Diagram(node: ModdleElement): boolean {
    const definitions = definitionsOf(node);
    if (!definitions) {
      return false;
    }

    const executionPlatform = definitions.get('modeler:executionPlatform');
    if (executionPlatform !== undefined) {
      return executionPlatform === CAMUNDA_7_EXECUTION_PLATFORM;
    }

    return declaresCamunda7Namespace(definitions);
  }

  function messageEventDefinitionOf(node: ModdleElement): ModdleElement | undefined {
    return (node.eventDefinitions ?? []).find((definition: ModdleElement) =>
      is(definition, 'bpmn:MessageEventDefinition'),
    );
  }

  function isMessageThrowEvent(node: ModdleElement): boolean {
    return isAny(node, MESSAGE_THROW_EVENTS) && messageEventDefinitionOf(node) !== undefined;
  }

  function isExternalTask(node: ModdleElement): boolean {
    if (isAny(node, EXTERNAL_CAPABLE_TASKS)) {
      return node.get('camunda:type') === 'external';
    }
    return (
      isMessageThrowEvent(node) && messageEventDefinitionOf(node).get('camunda:type') === 'external'
    );
  }

  function isWaitState(node: ModdleElement): boolean {
    return isAny(node, NATIVE_WAIT_STATES) || isExternalTask(node);
  }

  function isMultiInstance(node: ModdleElement): boolean {
    return (
      node.loopCharacteristics !== undefined &&
      is(node.loopCharacteristics, 'bpmn:MultiInstanceLoopCharacteristics')
    );
  }

  function isRemoteCall(node: ModdleElement): boolean {
    return (isAny(node, REMOTE_CALL_TASKS) || isMessageThrowEvent(node)) && !isExternalTask(node);
  }

  function isProcessStartEvent(node: ModdleElement): boolean {
    return is(node, 'bpmn:StartEvent') && is(node.$parent, 'bpmn:Process');
  }

  function isJoin(node: ModdleElement): boolean {
    return isAny(node, JOIN_GATEWAYS) && (node.incoming ?? []).length > 1;
  }

  function missingAsyncBeforeMessage(node: ModdleElement): string | undefined {
    if (multiInstance && isMultiInstance(node)) {
      return MESSAGES.multiInstance;
    }
    if (serviceTasks && isRemoteCall(node)) {
      return MESSAGES.serviceTasks;
    }
    if (startEvents && isProcessStartEvent(node)) {
      return MESSAGES.startEvents;
    }
    if (joins && isJoin(node)) {
      return MESSAGES.joins;
    }
    return undefined;
  }

  function check(node: ModdleElement, reporter: Reporter): void {
    if (!node.id || !is(node, 'bpmn:FlowNode') || !isCamunda7Diagram(node)) {
      return;
    }

    if (hasAsyncBefore(node)) {
      if (waitStates && isWaitState(node) && !isMultiInstance(node)) {
        reporter.report(node.id, MESSAGES.waitStates);
      }
    } else {
      const message = missingAsyncBeforeMessage(node);
      if (message) {
        reporter.report(node.id, message);
      }
    }

    if (userTasks && is(node, 'bpmn:UserTask') && !hasAsyncAfter(node)) {
      reporter.report(node.id, MESSAGES.userTasks);
    }
  }

  return { check };
}

asyncContinuations.ruleName = 'camunda-7-async-continuations' as const;
