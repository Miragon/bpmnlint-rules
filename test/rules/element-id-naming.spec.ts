import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/element-id-naming';
import { model } from '../support/model';

verify('element-id-naming', rule, {
  valid: [
    {
      name: 'every element type follows the shipped convention',
      moddleElement: model({
        shapes: [
          { id: 'startEvent_membershipRequested', tag: 'startEvent' },
          { id: 'serviceTask_claimMembership', tag: 'serviceTask' },
          { id: 'userTask_confirmMembership', tag: 'userTask' },
          { id: 'gateway_hasEmptySpots', tag: 'exclusiveGateway' },
          { id: 'subProcess_confirmMembership', tag: 'subProcess' },
          { id: 'callActivity_billing', tag: 'callActivity' },
          {
            id: 'event_reminderDue',
            tag: 'boundaryEvent',
            attachedTo: 'serviceTask_claimMembership',
          },
          { id: 'endEvent_membershipActivated', tag: 'endEvent' },
        ],
        edges: [
          {
            id: 'flow_startToClaim',
            source: 'startEvent_membershipRequested',
            target: 'serviceTask_claimMembership',
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
          { id: 'subProcess_payment', tag: 'transaction' },
          { id: 'subProcess_research', tag: 'adHocSubProcess' },
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
        shapes: [{ id: 'serviceTask_claimMembership', tag: 'serviceTask' }],
        edges: [
          {
            id: 'Flow_claimToGateway',
            source: 'serviceTask_claimMembership',
            target: 'serviceTask_claimMembership',
          },
        ],
      }),
    },
    {
      // A PascalCase body can still be opted into per project.
      name: 'a different body case can be configured',
      config: { case: 'PascalCase' },
      moddleElement: model({
        shapes: [{ id: 'serviceTask_ClaimMembership', tag: 'serviceTask' }],
        edges: [
          {
            id: 'flow_ClaimToGateway',
            source: 'serviceTask_ClaimMembership',
            target: 'serviceTask_ClaimMembership',
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
        message: 'Element id must match the naming convention <serviceTask_camelCase>',
      },
    },
    {
      name: 'right prefix, wrong case',
      moddleElement: model({
        shapes: [{ id: 'serviceTask_ClaimMembership', tag: 'serviceTask' }],
      }),
      report: {
        id: 'serviceTask_ClaimMembership',
        message: 'Element id must match the naming convention <serviceTask_camelCase>',
      },
    },
    {
      name: 'right case, no prefix',
      moddleElement: model({
        shapes: [{ id: 'claimMembership', tag: 'serviceTask' }],
      }),
      report: {
        id: 'claimMembership',
        message: 'Element id must match the naming convention <serviceTask_camelCase>',
      },
    },
    {
      // A service task labelled with the *generic* task prefix: the ID no longer says what kind
      // of element it is, which is half the value of the convention.
      name: 'a specific type may not use the generic task prefix',
      moddleElement: model({
        shapes: [{ id: 'task_claimMembership', tag: 'serviceTask' }],
      }),
      report: {
        id: 'task_claimMembership',
        message: 'Element id must match the naming convention <serviceTask_camelCase>',
      },
    },
    {
      name: 'a sequence flow is held to the convention too',
      moddleElement: model({
        shapes: [{ id: 'serviceTask_claimMembership', tag: 'serviceTask' }],
        edges: [
          {
            id: 'Flow_1sy6h9p',
            source: 'serviceTask_claimMembership',
            target: 'serviceTask_claimMembership',
          },
        ],
      }),
      report: {
        id: 'Flow_1sy6h9p',
        message: 'Element id must match the naming convention <flow_camelCase>',
      },
    },
  ],
});
