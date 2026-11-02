import { is } from 'bpmnlint-utils';

import type { ModdleElement } from '../../../lib/moddle';
import type { SavePointKey } from './SavePointDefaults';

/**
 * An element that carries `camunda:asyncBefore` / `camunda:asyncAfter`, and the key it obeys.
 */
export interface SavePointLocation {
  flagOwner: ModdleElement;
  key: SavePointKey;
}

const KEYS_BY_TYPE: [string, SavePointKey][] = [
  ['bpmn:ServiceTask', 'serviceTasks'],
  ['bpmn:SendTask', 'sendTasks'],
  ['bpmn:BusinessRuleTask', 'businessRuleTasks'],
  ['bpmn:ScriptTask', 'scriptTasks'],
  ['bpmn:UserTask', 'userTasks'],
  ['bpmn:ReceiveTask', 'receiveTasks'],
  ['bpmn:ManualTask', 'manualTasks'],
  ['bpmn:CallActivity', 'callActivities'],
  ['bpmn:SubProcess', 'subProcesses'],
  ['bpmn:IntermediateCatchEvent', 'intermediateCatchEvents'],
  ['bpmn:IntermediateThrowEvent', 'intermediateThrowEvents'],
  ['bpmn:EndEvent', 'endEvents'],
  ['bpmn:BoundaryEvent', 'boundaryEvents'],
  ['bpmn:ParallelGateway', 'parallelGateways'],
  ['bpmn:InclusiveGateway', 'inclusiveGateways'],
  ['bpmn:ExclusiveGateway', 'exclusiveGateways'],
  ['bpmn:EventBasedGateway', 'eventBasedGateways'],
];

const EXTERNAL_TASK_KEYS: Record<string, SavePointKey> = {
  'bpmn:ServiceTask': 'externalServiceTasks',
  'bpmn:SendTask': 'externalSendTasks',
  'bpmn:BusinessRuleTask': 'externalBusinessRuleTasks',
};

const MESSAGE_THROW_KEYS: Record<string, { internal: SavePointKey; external: SavePointKey }> = {
  'bpmn:IntermediateThrowEvent': {
    internal: 'messageIntermediateThrowEvents',
    external: 'externalMessageIntermediateThrowEvents',
  },
  'bpmn:EndEvent': { internal: 'messageEndEvents', external: 'externalMessageEndEvents' },
};

const JOIN_KEYS: Record<string, SavePointKey> = {
  'bpmn:ParallelGateway': 'parallelJoins',
  'bpmn:InclusiveGateway': 'inclusiveJoins',
};

/**
 * Finds where a flow node keeps its save-point flags and which key of the defaults applies there:
 * always the most specific one, so an external service task is `externalServiceTasks`. A
 * multi-instance activity has two locations: its body (the element) follows `multiInstanceBodies`,
 * each instance (the loop characteristics) follows the key of the activity itself. Start events
 * outside a process and complex gateways have none.
 */
export class SavePointLocator {
  locate(node: ModdleElement): SavePointLocation[] {
    const loop = node.loopCharacteristics;
    const key = this.keyOf(node);
    const isMultiInstance = loop && is(loop, 'bpmn:MultiInstanceLoopCharacteristics');
    if (isMultiInstance) {
      const body: SavePointLocation = { flagOwner: node, key: 'multiInstanceBodies' };
      return key ? [body, { flagOwner: loop, key }] : [body];
    }
    return key ? [{ flagOwner: node, key }] : [];
  }

  private keyOf(node: ModdleElement): SavePointKey | undefined {
    if (is(node, 'bpmn:StartEvent')) {
      return this.startEventKeyOf(node);
    }
    return (
      this.externalTaskKeyOf(node) ??
      this.messageThrowKeyOf(node) ??
      this.joinKeyOf(node) ??
      this.plainKeyOf(node)
    );
  }

  private startEventKeyOf(startEvent: ModdleElement): SavePointKey | undefined {
    if (!is(startEvent.$parent, 'bpmn:Process')) {
      return undefined;
    }
    const isTimerStart = (startEvent.eventDefinitions ?? []).some((definition: ModdleElement) =>
      is(definition, 'bpmn:TimerEventDefinition'),
    );
    return isTimerStart ? 'timerStartEvents' : 'startEvents';
  }

  private externalTaskKeyOf(node: ModdleElement): SavePointKey | undefined {
    const isExternal = node.get('camunda:type') === 'external';
    return isExternal ? EXTERNAL_TASK_KEYS[node.$type] : undefined;
  }

  private messageThrowKeyOf(node: ModdleElement): SavePointKey | undefined {
    const keys = MESSAGE_THROW_KEYS[node.$type];
    const message = (node.eventDefinitions ?? []).find((definition: ModdleElement) =>
      is(definition, 'bpmn:MessageEventDefinition'),
    );
    if (!keys || !message) {
      return undefined;
    }
    return message.get('camunda:type') === 'external' ? keys.external : keys.internal;
  }

  private joinKeyOf(node: ModdleElement): SavePointKey | undefined {
    const hasSeveralIncomingFlows = (node.incoming ?? []).length > 1;
    return hasSeveralIncomingFlows ? JOIN_KEYS[node.$type] : undefined;
  }

  private plainKeyOf(node: ModdleElement): SavePointKey | undefined {
    if (node.$type === 'bpmn:Task') {
      return 'undefinedTasks';
    }
    return KEYS_BY_TYPE.find(([type]) => is(node, type))?.[1];
  }
}
