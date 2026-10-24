import { is, isAny } from 'bpmnlint-utils';

import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';
import { defineRule } from '../../lib/utils/defineRule';

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
 *     "@miragon/rules/async-continuations": [ "error", {
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
class AsyncContinuations implements Rule {
  private readonly checks: Required<AsyncContinuationsConfig>;

  constructor(config?: AsyncContinuationsConfig) {
    this.checks = {
      serviceTasks: true,
      userTasks: true,
      startEvents: true,
      joins: true,
      multiInstance: true,
      waitStates: true,
      ...config,
    };
  }

  check(node: ModdleElement, reporter: Reporter): void {
    if (!node.id || !is(node, 'bpmn:FlowNode') || !this.isCamunda7Diagram(node)) {
      return;
    }

    if (this.hasAsyncBefore(node)) {
      if (this.checks.waitStates && this.isWaitState(node) && !this.isMultiInstance(node)) {
        reporter.report(node.id, MESSAGES.waitStates);
      }
    } else {
      const message = this.missingAsyncBeforeMessage(node);
      if (message) {
        reporter.report(node.id, message);
      }
    }

    if (this.checks.userTasks && is(node, 'bpmn:UserTask') && !this.hasAsyncAfter(node)) {
      reporter.report(node.id, MESSAGES.userTasks);
    }
  }

  private missingAsyncBeforeMessage(node: ModdleElement): string | undefined {
    if (this.checks.multiInstance && this.isMultiInstance(node)) {
      return MESSAGES.multiInstance;
    }
    if (this.checks.serviceTasks && this.isRemoteCall(node)) {
      return MESSAGES.serviceTasks;
    }
    if (this.checks.startEvents && this.isProcessStartEvent(node)) {
      return MESSAGES.startEvents;
    }
    if (this.checks.joins && this.isJoin(node)) {
      return MESSAGES.joins;
    }
    return undefined;
  }

  private isFlagSet(value: unknown): boolean {
    return value === true || value === 'true';
  }

  private hasAsyncBefore(node: ModdleElement): boolean {
    return (
      this.isFlagSet(node.get('camunda:asyncBefore')) || this.isFlagSet(node.get('camunda:async'))
    );
  }

  private hasAsyncAfter(node: ModdleElement): boolean {
    return this.isFlagSet(node.get('camunda:asyncAfter'));
  }

  private definitionsOf(node: ModdleElement): ModdleElement | undefined {
    let current = node;
    while (current && !is(current, 'bpmn:Definitions')) {
      current = current.$parent;
    }
    return current;
  }

  private declaresCamunda7Namespace(definitions: ModdleElement): boolean {
    return Object.entries(definitions.$attrs ?? {}).some(
      ([name, value]) => name.startsWith('xmlns:') && value === CAMUNDA_7_NAMESPACE,
    );
  }

  private isCamunda7Diagram(node: ModdleElement): boolean {
    const definitions = this.definitionsOf(node);
    if (!definitions) {
      return false;
    }

    const executionPlatform = definitions.get('modeler:executionPlatform');
    if (executionPlatform !== undefined) {
      return executionPlatform === CAMUNDA_7_EXECUTION_PLATFORM;
    }

    return this.declaresCamunda7Namespace(definitions);
  }

  private messageEventDefinitionOf(node: ModdleElement): ModdleElement | undefined {
    return (node.eventDefinitions ?? []).find((definition: ModdleElement) =>
      is(definition, 'bpmn:MessageEventDefinition'),
    );
  }

  private isMessageThrowEvent(node: ModdleElement): boolean {
    return isAny(node, MESSAGE_THROW_EVENTS) && this.messageEventDefinitionOf(node) !== undefined;
  }

  private isExternalTask(node: ModdleElement): boolean {
    if (isAny(node, EXTERNAL_CAPABLE_TASKS)) {
      return node.get('camunda:type') === 'external';
    }
    return (
      this.isMessageThrowEvent(node) &&
      this.messageEventDefinitionOf(node).get('camunda:type') === 'external'
    );
  }

  private isWaitState(node: ModdleElement): boolean {
    return isAny(node, NATIVE_WAIT_STATES) || this.isExternalTask(node);
  }

  private isMultiInstance(node: ModdleElement): boolean {
    return (
      node.loopCharacteristics !== undefined &&
      is(node.loopCharacteristics, 'bpmn:MultiInstanceLoopCharacteristics')
    );
  }

  private isRemoteCall(node: ModdleElement): boolean {
    return (
      (isAny(node, REMOTE_CALL_TASKS) || this.isMessageThrowEvent(node)) &&
      !this.isExternalTask(node)
    );
  }

  private isProcessStartEvent(node: ModdleElement): boolean {
    return is(node, 'bpmn:StartEvent') && is(node.$parent, 'bpmn:Process');
  }

  private isJoin(node: ModdleElement): boolean {
    return isAny(node, JOIN_GATEWAYS) && (node.incoming ?? []).length > 1;
  }
}

export default defineRule(
  { ruleName: 'async-continuations', kind: 'engine-specific', targetEngine: 'c7' },
  AsyncContinuations,
);
