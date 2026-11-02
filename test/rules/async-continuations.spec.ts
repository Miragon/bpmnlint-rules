import { verify } from 'bpmnlint/lib/testers/rule-tester';
import { createModdle } from 'bpmnlint/lib/testers/helper';
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json';

import rule from '../../src/rules/miragon/async-continuations';
import type { EdgeSpec, ShapeSpec } from '../support/model';
import { model } from '../support/model';

const CAMUNDA_NAMESPACE = { 'xmlns:camunda': 'http://camunda.org/schema/1.0/bpmn' };
const MODELER_NAMESPACE = { 'xmlns:modeler': 'http://camunda.org/schema/modeler/1.0' };
const CAMUNDA_7 = {
  ...CAMUNDA_NAMESPACE,
  ...MODELER_NAMESPACE,
  'modeler:executionPlatform': 'Camunda Platform',
};

const ASYNC_BEFORE = { 'camunda:asyncBefore': 'true' };
const ASYNC_AFTER = { 'camunda:asyncAfter': 'true' };

const MESSAGES = {
  remoteCall:
    'Add camunda:asyncBefore so a failing call rolls back to this task, not the last wait state',
  userTask: 'Add camunda:asyncAfter so completing the task commits before the following steps run',
  start: 'Add camunda:asyncBefore so the caller gets the instance back before work starts',
  join: 'Add camunda:asyncBefore so joining paths do not collide with an OptimisticLockingException',
  multiInstanceBody:
    'Add camunda:asyncBefore so the instances start in their own transaction, not the caller one',
  waitState:
    'Remove camunda:asyncBefore: a wait state already commits, the extra job is only overhead',
  timerStart:
    'Remove camunda:asyncBefore: a timer start event already fires as a job, a second one is overhead',
  forbiddenAfter: 'Remove camunda:asyncAfter: the save-point policy forbids it for serviceTasks',
  forbiddenBefore:
    'Remove camunda:asyncBefore: the save-point policy forbids it for exclusiveGateways',
  requiredAfter:
    'Add camunda:asyncAfter: the save-point policy requires it for externalServiceTasks',
};

const camunda7 = (shapes: ShapeSpec[], edges: EdgeSpec[] = []) =>
  model({ shapes, edges, definitionsAttributes: CAMUNDA_7 });

/** start → user task → service task → fork → two script tasks → join → MI task → end, all async-correct. */
const SAVE_POINTS_IN_PLACE: { shapes: ShapeSpec[]; edges: EdgeSpec[] } = {
  shapes: [
    { id: 'startEvent_orderPlaced', tag: 'startEvent', attributes: ASYNC_BEFORE },
    { id: 'userTask_approveOrder', tag: 'userTask', attributes: ASYNC_AFTER },
    { id: 'serviceTask_chargeCard', tag: 'serviceTask', attributes: ASYNC_BEFORE },
    { id: 'gateway_split', tag: 'parallelGateway' },
    { id: 'scriptTask_packItems', tag: 'scriptTask', attributes: ASYNC_BEFORE },
    { id: 'sendTask_notifyCustomer', tag: 'sendTask', attributes: ASYNC_BEFORE },
    { id: 'gateway_join', tag: 'parallelGateway', attributes: ASYNC_BEFORE },
    {
      id: 'serviceTask_shipParcels',
      tag: 'serviceTask',
      isMultiInstance: true,
      attributes: ASYNC_BEFORE,
      multiInstanceAttributes: ASYNC_BEFORE,
    },
    { id: 'endEvent_orderShipped', tag: 'endEvent' },
  ],
  edges: [
    { id: 'flow_1', source: 'startEvent_orderPlaced', target: 'userTask_approveOrder' },
    { id: 'flow_2', source: 'userTask_approveOrder', target: 'serviceTask_chargeCard' },
    { id: 'flow_3', source: 'serviceTask_chargeCard', target: 'gateway_split' },
    { id: 'flow_4', source: 'gateway_split', target: 'scriptTask_packItems' },
    { id: 'flow_5', source: 'gateway_split', target: 'sendTask_notifyCustomer' },
    { id: 'flow_6', source: 'scriptTask_packItems', target: 'gateway_join' },
    { id: 'flow_7', source: 'sendTask_notifyCustomer', target: 'gateway_join' },
    { id: 'flow_8', source: 'gateway_join', target: 'serviceTask_shipParcels' },
    { id: 'flow_9', source: 'serviceTask_shipParcels', target: 'endEvent_orderShipped' },
  ],
};

/** The same model with every async flag stripped: it trips every "missing" check at once. */
const NO_SAVE_POINTS = {
  shapes: SAVE_POINTS_IN_PLACE.shapes.map((shape) => ({
    ...shape,
    attributes: {},
    multiInstanceAttributes: {},
  })),
  edges: SAVE_POINTS_IN_PLACE.edges,
};

const camunda7Xml = (process: string, moddleExtensions?: object) =>
  createModdle(
    `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
    xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
    id="definitions_Test"
    targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="process_Test" isExecutable="true">
${process}
  </bpmn:process>
</bpmn:definitions>`,
    moddleExtensions,
  );

verify('async-continuations', rule, {
  valid: [
    {
      name: 'every save point sits where Camunda recommends it',
      moddleElement: camunda7(SAVE_POINTS_IN_PLACE.shapes, SAVE_POINTS_IN_PLACE.edges),
    },
    {
      name: 'a Camunda 8 diagram is not checked',
      moddleElement: model({
        ...NO_SAVE_POINTS,
        definitionsAttributes: {
          ...MODELER_NAMESPACE,
          'xmlns:zeebe': 'http://camunda.org/schema/zeebe/1.0',
          'modeler:executionPlatform': 'Camunda Cloud',
        },
      }),
    },
    {
      name: 'a plain BPMN diagram without the camunda namespace is not checked',
      moddleElement: model(NO_SAVE_POINTS),
    },
    {
      name: 'a declared camunda namespace beside a Camunda 8 platform is not checked',
      moddleElement: model({
        ...NO_SAVE_POINTS,
        definitionsAttributes: {
          ...CAMUNDA_NAMESPACE,
          ...MODELER_NAMESPACE,
          'modeler:executionPlatform': 'Camunda Cloud',
        },
      }),
    },
    {
      name: 'an external service task is a wait state and needs no asyncBefore',
      moddleElement: camunda7([
        {
          id: 'serviceTask_chargeCard',
          tag: 'serviceTask',
          attributes: { 'camunda:type': 'external' },
        },
      ]),
    },
    {
      name: 'an external message throw event is a wait state and needs no asyncBefore',
      moddleElement: camunda7Xml(`
    <bpmn:intermediateThrowEvent id="event_orderConfirmed">
      <bpmn:messageEventDefinition id="def_orderConfirmed" camunda:type="external" camunda:topic="confirm" />
    </bpmn:intermediateThrowEvent>`),
    },
    {
      name: 'a start event inside a sub-process needs no asyncBefore',
      moddleElement: camunda7([
        { id: 'subProcess_handleOrder', tag: 'subProcess', attributes: ASYNC_BEFORE },
        { id: 'startEvent_handlingStarted', tag: 'startEvent', parent: 'subProcess_handleOrder' },
      ]),
    },
    {
      name: 'a timer start event already runs as a job and needs no asyncBefore',
      moddleElement: camunda7Xml(`
    <bpmn:startEvent id="startEvent_everyNight">
      <bpmn:timerEventDefinition id="def_everyNight" />
    </bpmn:startEvent>`),
    },
    {
      name: 'a forking parallel gateway needs no asyncBefore',
      moddleElement: camunda7(
        [
          { id: 'gateway_split', tag: 'parallelGateway' },
          { id: 'task_packItems', tag: 'task' },
          { id: 'task_printLabel', tag: 'task' },
        ],
        [
          { id: 'flow_toPack', source: 'gateway_split', target: 'task_packItems' },
          { id: 'flow_toPrint', source: 'gateway_split', target: 'task_printLabel' },
        ],
      ),
    },
    {
      name: 'a multi-instance user task commits each instance through its loop characteristics',
      moddleElement: camunda7([
        {
          id: 'userTask_reviewItems',
          tag: 'userTask',
          isMultiInstance: true,
          attributes: ASYNC_BEFORE,
          multiInstanceAttributes: ASYNC_AFTER,
        },
      ]),
    },
    {
      name: 'the legacy camunda:async counts as asyncBefore',
      moddleElement: camunda7([
        {
          id: 'serviceTask_chargeCard',
          tag: 'serviceTask',
          attributes: { 'camunda:async': 'true' },
        },
      ]),
    },
    {
      name: 'typed booleans from the camunda moddle extension count as set',
      moddleElement: camunda7Xml(
        `
    <bpmn:startEvent id="startEvent_orderPlaced" camunda:asyncBefore="true" />
    <bpmn:userTask id="userTask_approveOrder" camunda:asyncAfter="true" />
    <bpmn:serviceTask id="serviceTask_chargeCard" camunda:asyncBefore="true" />`,
        { camunda: camundaModdle },
      ),
    },
    {
      name: 'every check switched off reports nothing',
      config: {
        serviceTasks: false,
        userTasks: false,
        sendTasks: false,
        scriptTasks: false,
        startEvents: false,
        parallelJoins: false,
        multiInstanceBodies: false,
      },
      moddleElement: camunda7(NO_SAVE_POINTS.shapes, NO_SAVE_POINTS.edges),
    },
    {
      name: 'the defaults allow asyncAfter on an external service task',
      moddleElement: camunda7([
        {
          id: 'serviceTask_chargeCard',
          tag: 'serviceTask',
          attributes: { ...ASYNC_AFTER, 'camunda:type': 'external' },
        },
      ]),
    },
    {
      name: 'a key set to false allows every slot of it',
      config: { userTasks: false },
      moddleElement: camunda7([
        { id: 'userTask_approveOrder', tag: 'userTask', attributes: ASYNC_BEFORE },
      ]),
    },
    {
      name: 'a slot override replaces only that slot',
      config: { serviceTasks: { before: 'allowed' } },
      moddleElement: camunda7([{ id: 'serviceTask_chargeCard', tag: 'serviceTask' }]),
    },
    {
      name: 'the minimal preset keeps the required asyncBefore on a multi-instance body',
      config: { preset: 'minimal' },
      moddleElement: camunda7([
        {
          id: 'serviceTask_shipParcels',
          tag: 'serviceTask',
          isMultiInstance: true,
          attributes: ASYNC_BEFORE,
          multiInstanceAttributes: ASYNC_BEFORE,
        },
      ]),
    },
  ],
  invalid: [
    {
      name: 'a multi-instance user task checks the body and each instance on its own',
      moddleElement: camunda7([
        {
          id: 'userTask_reviewItems',
          tag: 'userTask',
          isMultiInstance: true,
        },
      ]),
      report: [
        { id: 'userTask_reviewItems', message: MESSAGES.multiInstanceBody },
        { id: 'userTask_reviewItems', message: MESSAGES.userTask },
      ],
    },
    {
      name: 'asyncBefore on a timer start event only adds a second job',
      moddleElement: camunda7Xml(`
    <bpmn:startEvent id="startEvent_everyNight" camunda:asyncBefore="true">
      <bpmn:timerEventDefinition id="def_everyNight" />
    </bpmn:startEvent>`),
      report: { id: 'startEvent_everyNight', message: MESSAGES.timerStart },
    },
    {
      name: 'the minimal preset forbids an asyncAfter in front of a multi-instance body',
      config: { preset: 'minimal' },
      moddleElement: camunda7(
        [
          {
            id: 'serviceTask_loadParcels',
            tag: 'serviceTask',
            attributes: { ...ASYNC_BEFORE, ...ASYNC_AFTER },
          },
          {
            id: 'serviceTask_shipParcels',
            tag: 'serviceTask',
            isMultiInstance: true,
            attributes: ASYNC_BEFORE,
            multiInstanceAttributes: ASYNC_BEFORE,
          },
        ],
        [{ id: 'flow_1', source: 'serviceTask_loadParcels', target: 'serviceTask_shipParcels' }],
      ),
      report: { id: 'serviceTask_loadParcels', message: MESSAGES.forbiddenAfter },
    },
    {
      name: 'a slot override on a specific key replaces its default',
      config: { externalServiceTasks: { after: 'required' } },
      moddleElement: camunda7([
        {
          id: 'serviceTask_chargeCard',
          tag: 'serviceTask',
          attributes: { 'camunda:type': 'external' },
        },
      ]),
      report: { id: 'serviceTask_chargeCard', message: MESSAGES.requiredAfter },
    },
    {
      name: 'a forbidden slot on a non-wait state gets the policy message',
      config: { exclusiveGateways: { before: 'forbidden' } },
      moddleElement: camunda7([
        { id: 'gateway_isPaid', tag: 'exclusiveGateway', attributes: ASYNC_BEFORE },
      ]),
      report: { id: 'gateway_isPaid', message: MESSAGES.forbiddenBefore },
    },
    {
      name: 'each instance of a multi-instance service task needs its own asyncBefore',
      moddleElement: camunda7Xml(`
    <bpmn:serviceTask id="serviceTask_shipParcels" camunda:asyncBefore="true">
      <bpmn:multiInstanceLoopCharacteristics id="loop_shipParcels" />
    </bpmn:serviceTask>`),
      report: { id: 'serviceTask_shipParcels', message: MESSAGES.remoteCall },
    },
    {
      name: 'a message start event still needs asyncBefore',
      moddleElement: camunda7Xml(`
    <bpmn:startEvent id="startEvent_orderReceived">
      <bpmn:messageEventDefinition id="def_orderReceived" />
    </bpmn:startEvent>`),
      report: { id: 'startEvent_orderReceived', message: MESSAGES.start },
    },
    {
      name: 'a diagram without any save point trips every missing check',
      moddleElement: camunda7(NO_SAVE_POINTS.shapes, NO_SAVE_POINTS.edges),
      report: [
        { id: 'startEvent_orderPlaced', message: MESSAGES.start },
        { id: 'userTask_approveOrder', message: MESSAGES.userTask },
        { id: 'serviceTask_chargeCard', message: MESSAGES.remoteCall },
        { id: 'scriptTask_packItems', message: MESSAGES.remoteCall },
        { id: 'sendTask_notifyCustomer', message: MESSAGES.remoteCall },
        { id: 'gateway_join', message: MESSAGES.join },
        { id: 'serviceTask_shipParcels', message: MESSAGES.multiInstanceBody },
        { id: 'serviceTask_shipParcels', message: MESSAGES.remoteCall },
      ],
    },
    {
      name: 'a camunda namespace without an execution platform counts as Camunda 7',
      moddleElement: model({
        shapes: [{ id: 'serviceTask_chargeCard', tag: 'serviceTask' }],
        definitionsAttributes: CAMUNDA_NAMESPACE,
      }),
      report: { id: 'serviceTask_chargeCard', message: MESSAGES.remoteCall },
    },
    {
      name: 'a message throw and a message end event need asyncBefore',
      moddleElement: camunda7([
        {
          id: 'event_orderConfirmed',
          tag: 'intermediateThrowEvent',
          eventDefinitions: ['message'],
        },
        { id: 'endEvent_orderSent', tag: 'endEvent', eventDefinitions: ['message'] },
      ]),
      report: [
        { id: 'event_orderConfirmed', message: MESSAGES.remoteCall },
        { id: 'endEvent_orderSent', message: MESSAGES.remoteCall },
      ],
    },
    {
      name: 'an inclusive join needs asyncBefore',
      moddleElement: camunda7(
        [
          { id: 'task_packItems', tag: 'task' },
          { id: 'task_printLabel', tag: 'task' },
          { id: 'gateway_join', tag: 'inclusiveGateway' },
        ],
        [
          { id: 'flow_fromPack', source: 'task_packItems', target: 'gateway_join' },
          { id: 'flow_fromPrint', source: 'task_printLabel', target: 'gateway_join' },
        ],
      ),
      report: { id: 'gateway_join', message: MESSAGES.join },
    },
    {
      name: 'asyncBefore on a wait state is overhead',
      moddleElement: camunda7([
        {
          id: 'userTask_approveOrder',
          tag: 'userTask',
          attributes: { ...ASYNC_BEFORE, ...ASYNC_AFTER },
        },
        { id: 'receiveTask_paymentReceived', tag: 'receiveTask', attributes: ASYNC_BEFORE },
        {
          id: 'event_reminderDue',
          tag: 'intermediateCatchEvent',
          eventDefinitions: ['timer'],
          attributes: ASYNC_BEFORE,
        },
        { id: 'gateway_awaitAnswer', tag: 'eventBasedGateway', attributes: ASYNC_BEFORE },
        {
          id: 'serviceTask_chargeCard',
          tag: 'serviceTask',
          attributes: { ...ASYNC_BEFORE, 'camunda:type': 'external' },
        },
      ]),
      report: [
        { id: 'userTask_approveOrder', message: MESSAGES.waitState },
        { id: 'receiveTask_paymentReceived', message: MESSAGES.waitState },
        { id: 'event_reminderDue', message: MESSAGES.waitState },
        { id: 'gateway_awaitAnswer', message: MESSAGES.waitState },
        { id: 'serviceTask_chargeCard', message: MESSAGES.waitState },
      ],
    },
    {
      name: 'a user task with asyncBefore and without asyncAfter gets both reports',
      moddleElement: camunda7([
        { id: 'userTask_approveOrder', tag: 'userTask', attributes: ASYNC_BEFORE },
      ]),
      report: [
        { id: 'userTask_approveOrder', message: MESSAGES.waitState },
        { id: 'userTask_approveOrder', message: MESSAGES.userTask },
      ],
    },
    {
      name: 'a switched-off check leaves the others active',
      config: { userTasks: false },
      moddleElement: camunda7([
        { id: 'userTask_approveOrder', tag: 'userTask' },
        { id: 'serviceTask_chargeCard', tag: 'serviceTask' },
      ]),
      report: { id: 'serviceTask_chargeCard', message: MESSAGES.remoteCall },
    },
  ],
});

describe('async-continuations config', () => {
  it.each<[object]>([
    [{ joins: false }],
    [{ waitStates: false }],
    [{ serviceTask: false }],
    [{ serviceTasks: true }],
    [{ serviceTasks: { before: 'sometimes' } }],
    [{ serviceTasks: { external: { before: 'forbidden' } } }],
    [{ preset: 'lazy' }],
  ])('rejects %j', (config) => {
    expect(() => rule(config as never)).toThrow(/async-continuations: invalid option/);
  });
});
