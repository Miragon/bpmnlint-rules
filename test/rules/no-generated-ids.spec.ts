import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/no-generated-ids';
import { model } from '../support/model';

const GENERATED = 'Element id looks generated — give it a readable, stable name';

verify('no-generated-ids', rule, {
  valid: [
    {
      name: 'ids a human chose',
      moddleElement: model({
        shapes: [
          { id: 'serviceTask_ClaimMembership', tag: 'serviceTask' },
          { id: 'gateway_HasEmptySpots', tag: 'exclusiveGateway' },
          { id: 'Flow_claim_to_gateway', tag: 'task' },
        ],
      }),
    },
    {
      // The critical non-report: a real word in the same length window as a generated token.
      // `nospots` is 7 lowercase characters, exactly like `0049ryx` — only the absence of a
      // digit separates them, which is why the digit is part of the pattern.
      name: 'a short all-letter suffix is a word, not a token',
      moddleElement: model({
        shapes: [
          { id: 'flow_nospots', tag: 'task' },
          { id: 'task_invoice', tag: 'task' },
          { id: 'task_message', tag: 'task' },
        ],
      }),
    },
    {
      name: 'a deliberate trailing counter on a qualified id is left alone',
      moddleElement: model({
        shapes: [{ id: 'userTask_Approve_2', tag: 'userTask' }],
      }),
    },
    {
      name: 'a long readable id is never a token',
      moddleElement: model({
        shapes: [{ id: 'serviceTask_SendConfirmationMail', tag: 'serviceTask' }],
      }),
    },
    {
      // Message/error/signal names are engine correlation keys, not things a reviewer points
      // at, so the rule stays out of them.
      name: 'non-flow elements are out of scope',
      moddleElement: model({
        shapes: [{ id: 'Annotation_0049ryx', tag: 'textAnnotation' }],
      }),
    },
  ],

  invalid: [
    {
      name: 'the modeler random token',
      moddleElement: model({
        shapes: [{ id: 'Activity_0049ryx', tag: 'serviceTask' }],
      }),
      report: { id: 'Activity_0049ryx', message: GENERATED },
    },
    {
      name: 'random tokens on gateways and flows',
      moddleElement: model({
        shapes: [{ id: 'Gateway_1x9j8k7', tag: 'exclusiveGateway' }],
        edges: [{ id: 'Flow_0a1b2c3', source: 'Gateway_1x9j8k7', target: 'Gateway_1x9j8k7' }],
      }),
      report: [
        { id: 'Gateway_1x9j8k7', message: GENERATED },
        { id: 'Flow_0a1b2c3', message: GENERATED },
      ],
    },
    {
      name: 'the older bare-counter form',
      moddleElement: model({
        shapes: [
          { id: 'StartEvent_1', tag: 'startEvent' },
          { id: 'EndEvent_12', tag: 'endEvent' },
        ],
      }),
      report: [
        { id: 'StartEvent_1', message: GENERATED },
        { id: 'EndEvent_12', message: GENERATED },
      ],
    },
  ],
});
