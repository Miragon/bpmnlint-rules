import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/element-id-naming';
import { model } from '../support/model';

verify('element-id-naming', rule, {
  valid: [
    {
      name: 'every element type follows the shipped convention',
      moddleElement: model({
        shapes: [
          { id: 'startEvent_MembershipRequested', tag: 'startEvent' },
          { id: 'serviceTask_ClaimMembership', tag: 'serviceTask' },
          { id: 'userTask_ConfirmMembership', tag: 'userTask' },
          { id: 'gateway_HasEmptySpots', tag: 'exclusiveGateway' },
          { id: 'subProcess_ConfirmMembership', tag: 'subProcess' },
          { id: 'callActivity_Billing', tag: 'callActivity' },
          {
            id: 'event_ReminderDue',
            tag: 'boundaryEvent',
            attachedTo: 'serviceTask_ClaimMembership',
          },
          { id: 'endEvent_MembershipActivated', tag: 'endEvent' },
        ],
        edges: [
          {
            id: 'flow_StartToClaim',
            source: 'startEvent_MembershipRequested',
            target: 'serviceTask_ClaimMembership',
          },
        ],
      }),
    },
    {
      // `bpmn:Transaction` and `bpmn:AdHocSubProcess` are not configured by name; they inherit
      // the sub-process convention through moddle's type hierarchy.
      name: 'subtypes inherit their base type convention',
      moddleElement: model({
        shapes: [
          { id: 'subProcess_Payment', tag: 'transaction' },
          { id: 'subProcess_Research', tag: 'adHocSubProcess' },
        ],
      }),
    },
    {
      // Nothing in the default map covers a text annotation, and an unconfigured type must
      // never produce a report — otherwise every exotic BPMN element becomes a false positive.
      name: 'unconfigured element types are not checked',
      moddleElement: model({
        shapes: [{ id: 'whatever_Name_1', tag: 'textAnnotation' }],
      }),
    },
    {
      name: 'the process id is not this rule business',
      moddleElement: model({ processId: 'membershipRequest', shapes: [] }),
    },
    {
      name: 'a custom prefix map is merged over the defaults',
      config: { prefixes: { 'bpmn:SequenceFlow': 'Flow_' } },
      moddleElement: model({
        shapes: [{ id: 'serviceTask_ClaimMembership', tag: 'serviceTask' }],
        edges: [
          {
            id: 'Flow_ClaimToGateway',
            source: 'serviceTask_ClaimMembership',
            target: 'serviceTask_ClaimMembership',
          },
        ],
      }),
    },
    {
      // The easy-zeebe convention: `Flow_` plus a snake_case body.
      name: 'a different body case can be configured',
      config: { case: 'snake_case', prefixes: { 'bpmn:SequenceFlow': 'Flow_' } },
      moddleElement: model({
        shapes: [{ id: 'serviceTask_claim_membership', tag: 'serviceTask' }],
        edges: [
          {
            id: 'Flow_claim_to_gateway',
            source: 'serviceTask_claim_membership',
            target: 'serviceTask_claim_membership',
          },
        ],
      }),
    },
    {
      name: 'a type can be switched off with false',
      config: { prefixes: { 'bpmn:ScriptTask': false } },
      moddleElement: model({
        shapes: [{ id: 'whateverYouLike', tag: 'scriptTask' }],
      }),
    },
  ],

  invalid: [
    {
      name: 'a generated id has neither the prefix nor the case',
      moddleElement: model({
        shapes: [{ id: 'Activity_0049ryx', tag: 'serviceTask' }],
      }),
      report: {
        id: 'Activity_0049ryx',
        message: 'Element id must match the naming convention <serviceTask_PascalCase>',
      },
    },
    {
      name: 'right prefix, wrong case',
      moddleElement: model({
        shapes: [{ id: 'serviceTask_claimMembership', tag: 'serviceTask' }],
      }),
      report: {
        id: 'serviceTask_claimMembership',
        message: 'Element id must match the naming convention <serviceTask_PascalCase>',
      },
    },
    {
      name: 'right case, no prefix',
      moddleElement: model({
        shapes: [{ id: 'ClaimMembership', tag: 'serviceTask' }],
      }),
      report: {
        id: 'ClaimMembership',
        message: 'Element id must match the naming convention <serviceTask_PascalCase>',
      },
    },
    {
      // A service task labelled with the *generic* task prefix: the ID no longer says what kind
      // of element it is, which is half the value of the convention.
      name: 'a specific type may not use the generic task prefix',
      moddleElement: model({
        shapes: [{ id: 'task_ClaimMembership', tag: 'serviceTask' }],
      }),
      report: {
        id: 'task_ClaimMembership',
        message: 'Element id must match the naming convention <serviceTask_PascalCase>',
      },
    },
    {
      name: 'a sequence flow is held to the convention too',
      moddleElement: model({
        shapes: [{ id: 'serviceTask_ClaimMembership', tag: 'serviceTask' }],
        edges: [
          {
            id: 'Flow_1sy6h9p',
            source: 'serviceTask_ClaimMembership',
            target: 'serviceTask_ClaimMembership',
          },
        ],
      }),
      report: {
        id: 'Flow_1sy6h9p',
        message: 'Element id must match the naming convention <flow_PascalCase>',
      },
    },
  ],
});
