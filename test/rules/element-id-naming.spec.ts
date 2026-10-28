import { createModdle } from 'bpmnlint/lib/testers/helper';
import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/element-id-naming';
import { model } from '../support/model';

interface CollaborationIds {
  collaboration: string;
  participant: string;
  externalParticipant: string;
  messageFlow: string;
  lane: string;
  dataObject: string;
  dataStore: string;
  annotation: string;
  group: string;
  association: string;
  dataInputAssociation: string;
  dataOutputAssociation: string;
}

const CONVENTIONAL_IDS: CollaborationIds = {
  collaboration: 'collaboration_membership',
  participant: 'participant_club',
  externalParticipant: 'participant_member',
  messageFlow: 'messageFlow_requestMembership',
  lane: 'lane_backOffice',
  dataObject: 'dataObject_application',
  dataStore: 'dataStore_members',
  annotation: 'textAnnotation_reviewHint',
  group: 'group_review',
  association: 'association_reviewHint',
  dataInputAssociation: 'association_readApplication',
  dataOutputAssociation: 'association_storeMember',
};

const GENERATED_IDS: CollaborationIds = {
  collaboration: 'Collaboration_0x1y2z3',
  participant: 'Participant_1a2b3c4',
  externalParticipant: 'Participant_0d5e6f7',
  messageFlow: 'Flow_0g8h9i0',
  lane: 'Lane_1j2k3l4',
  dataObject: 'DataObjectReference_0m5n6o7',
  dataStore: 'DataStoreReference_1p8q9r0',
  annotation: 'TextAnnotation_0s1t2u3',
  group: 'Group_1v4w5x6',
  association: 'Association_0y7z8a9',
  dataInputAssociation: 'DataInputAssociation_1b2c3d4',
  dataOutputAssociation: 'DataOutputAssociation_0e5f6g7',
};

/**
 * A pool with a lane, data, an annotation and a group, talking to a second pool. The `model`
 * helper only builds a bare process, so the collaboration-level elements need their own XML.
 */
const collaboration = (ids: CollaborationIds) =>
  createModdle(`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="definitions_Test" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="${ids.collaboration}">
    <bpmn:participant id="${ids.participant}" processRef="membershipRequest" />
    <bpmn:participant id="${ids.externalParticipant}" />
    <bpmn:messageFlow id="${ids.messageFlow}" sourceRef="${ids.externalParticipant}" targetRef="${ids.participant}" />
  </bpmn:collaboration>
  <bpmn:process id="membershipRequest" isExecutable="true">
    <bpmn:laneSet id="LaneSet_1q2w3e4">
      <bpmn:lane id="${ids.lane}">
        <bpmn:flowNodeRef>serviceTask_reviewApplication</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:serviceTask id="serviceTask_reviewApplication">
      <bpmn:dataInputAssociation id="${ids.dataInputAssociation}">
        <bpmn:sourceRef>${ids.dataObject}</bpmn:sourceRef>
      </bpmn:dataInputAssociation>
      <bpmn:dataOutputAssociation id="${ids.dataOutputAssociation}">
        <bpmn:targetRef>${ids.dataStore}</bpmn:targetRef>
      </bpmn:dataOutputAssociation>
    </bpmn:serviceTask>
    <bpmn:dataObjectReference id="${ids.dataObject}" dataObjectRef="DataObject_0a1b2c3" />
    <bpmn:dataObject id="DataObject_0a1b2c3" />
    <bpmn:dataStoreReference id="${ids.dataStore}" />
    <bpmn:textAnnotation id="${ids.annotation}" />
    <bpmn:association id="${ids.association}" sourceRef="serviceTask_reviewApplication" targetRef="${ids.annotation}" />
    <bpmn:group id="${ids.group}" />
  </bpmn:process>
</bpmn:definitions>`);

const conventionViolation = (id: string, prefix: string) => ({
  id,
  message: `Element id must match the naming convention <${prefix}camelCase>`,
});

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
      // Nothing in the default map covers a message, and an unconfigured type must never
      // produce a report — otherwise every exotic BPMN element becomes a false positive.
      name: 'unconfigured element types are not checked',
      moddleElement: model({
        messages: [{ id: 'Message_0abc123' }],
        shapes: [],
      }),
    },
    {
      // The lane set and the data object behind a reference are never drawn, so their
      // generated ids stay unchecked.
      name: 'collaboration, pool, lane, data, artifact and message flow ids follow the convention',
      moddleElement: collaboration(CONVENTIONAL_IDS),
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
      name: 'a kebab-case body can be configured',
      config: { case: 'kebab-case' },
      moddleElement: model({
        shapes: [{ id: 'serviceTask_claim-membership', tag: 'serviceTask' }],
      }),
    },
    {
      // An `Object.prototype` key is not a case name: it falls back to PascalCase like any
      // unknown value instead of crashing the rule.
      name: 'a case named after an Object.prototype key falls back to PascalCase',
      config: { case: 'toString' },
      moddleElement: model({
        shapes: [{ id: 'serviceTask_ClaimMembership', tag: 'serviceTask' }],
      }),
    },
    {
      name: 'a type can be switched off with false',
      config: { prefixes: { 'bpmn:ScriptTask': false } },
      moddleElement: model({
        shapes: [{ id: 'whateverYouLike', tag: 'scriptTask' }],
      }),
    },
    {
      // Default `optional`: the plain prefix stays valid on an event that carries a definition.
      name: 'the plain prefix is still accepted alongside the qualified form',
      moddleElement: model({
        shapes: [
          {
            id: 'startEvent_membershipRequested',
            tag: 'startEvent',
            eventDefinitions: ['message'],
          },
        ],
      }),
    },
    {
      // Default `optional`: a truthful qualifier passes, because the element really is a message event.
      name: 'a truthful event-definition qualifier is accepted',
      moddleElement: model({
        shapes: [
          {
            id: 'messageStartEvent_membershipRequested',
            tag: 'startEvent',
            eventDefinitions: ['message'],
          },
        ],
      }),
    },
    {
      // The qualifier is prepended to whatever prefix a project configures for the type.
      name: 'the qualifier composes with a custom event prefix',
      config: { prefixes: { 'bpmn:BoundaryEvent': 'boundaryEvent_' } },
      moddleElement: model({
        shapes: [
          { id: 'serviceTask_claimMembership', tag: 'serviceTask' },
          {
            id: 'messageBoundaryEvent_reminderDue',
            tag: 'boundaryEvent',
            attachedTo: 'serviceTask_claimMembership',
            eventDefinitions: ['message'],
          },
        ],
      }),
    },
    {
      // `off` restores one-prefix-per-type: the plain prefix is accepted.
      name: 'with the qualifier off the plain prefix is accepted',
      config: { eventDefinitionQualifier: 'off' },
      moddleElement: model({
        shapes: [
          {
            id: 'startEvent_membershipRequested',
            tag: 'startEvent',
            eventDefinitions: ['message'],
          },
        ],
      }),
    },
    {
      // `required`: an event with a definition must carry the qualified form.
      name: 'with the qualifier required the qualified form is accepted',
      config: { eventDefinitionQualifier: 'required' },
      moddleElement: model({
        shapes: [
          {
            id: 'timerStartEvent_membershipRequested',
            tag: 'startEvent',
            eventDefinitions: ['timer'],
          },
        ],
      }),
    },
    {
      // `required` falls back to the plain prefix when the element has no event definition at all.
      name: 'required falls back to the plain prefix without a definition',
      config: { eventDefinitionQualifier: 'required' },
      moddleElement: model({
        shapes: [{ id: 'startEvent_membershipRequested', tag: 'startEvent' }],
      }),
    },
  ],

  invalid: [
    {
      name: 'collaboration, pool, lane, data, artifact and message flow ids are held to the convention',
      moddleElement: collaboration(GENERATED_IDS),
      report: [
        conventionViolation(GENERATED_IDS.collaboration, 'collaboration_'),
        conventionViolation(GENERATED_IDS.participant, 'participant_'),
        conventionViolation(GENERATED_IDS.externalParticipant, 'participant_'),
        conventionViolation(GENERATED_IDS.messageFlow, 'messageFlow_'),
        conventionViolation(GENERATED_IDS.lane, 'lane_'),
        conventionViolation(GENERATED_IDS.dataInputAssociation, 'association_'),
        conventionViolation(GENERATED_IDS.dataOutputAssociation, 'association_'),
        conventionViolation(GENERATED_IDS.dataObject, 'dataObject_'),
        conventionViolation(GENERATED_IDS.dataStore, 'dataStore_'),
        conventionViolation(GENERATED_IDS.annotation, 'textAnnotation_'),
        conventionViolation(GENERATED_IDS.association, 'association_'),
        conventionViolation(GENERATED_IDS.group, 'group_'),
      ],
    },
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
      name: 'a case named after an Object.prototype key reports against PascalCase',
      config: { case: '__proto__' },
      moddleElement: model({
        shapes: [{ id: 'serviceTask_claimMembership', tag: 'serviceTask' }],
      }),
      report: {
        id: 'serviceTask_claimMembership',
        message: 'Element id must match the naming convention <serviceTask_PascalCase>',
      },
    },
    {
      name: 'a camelCase body under a configured kebab-case',
      config: { case: 'kebab-case' },
      moddleElement: model({
        shapes: [{ id: 'serviceTask_claimMembership', tag: 'serviceTask' }],
      }),
      report: {
        id: 'serviceTask_claimMembership',
        message: 'Element id must match the naming convention <serviceTask_kebab-case>',
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
    {
      // A lying qualifier: the id claims a timer event, but the element is a message event.
      name: 'a qualifier that the element does not have is reported as a lie',
      moddleElement: model({
        shapes: [
          {
            id: 'timerStartEvent_membershipRequested',
            tag: 'startEvent',
            eventDefinitions: ['message'],
          },
        ],
      }),
      report: {
        id: 'timerStartEvent_membershipRequested',
        message: 'Element id claims a timer event, but this element has no timer event definition',
      },
    },
    {
      // Qualifiers only apply to events: a non-event whose id happens to start with a qualifier
      // word (`error…`) must get the plain wrong-prefix message, never a bogus "claims an error
      // event" lie.
      name: 'a non-event is never reported as lying about a qualifier',
      moddleElement: model({
        shapes: [{ id: 'errorServiceTask_handle', tag: 'serviceTask' }],
      }),
      report: {
        id: 'errorServiceTask_handle',
        message: 'Element id must match the naming convention <serviceTask_camelCase>',
      },
    },
    {
      // Wrong case on an event that carries a definition: the message lists every accepted form.
      name: 'a wrong-case event id lists both the plain and qualified conventions',
      moddleElement: model({
        shapes: [
          {
            id: 'messageStartEvent_MembershipRequested',
            tag: 'startEvent',
            eventDefinitions: ['message'],
          },
        ],
      }),
      report: {
        id: 'messageStartEvent_MembershipRequested',
        message:
          'Element id must match the naming convention <startEvent_camelCase> or <messageStartEvent_camelCase>',
      },
    },
    {
      // With the qualifier off, the qualified form is no longer accepted.
      name: 'with the qualifier off the qualified form is rejected',
      config: { eventDefinitionQualifier: 'off' },
      moddleElement: model({
        shapes: [
          {
            id: 'messageStartEvent_membershipRequested',
            tag: 'startEvent',
            eventDefinitions: ['message'],
          },
        ],
      }),
      report: {
        id: 'messageStartEvent_membershipRequested',
        message: 'Element id must match the naming convention <startEvent_camelCase>',
      },
    },
    {
      // With the qualifier required, the plain prefix on a definition-carrying event is rejected.
      name: 'with the qualifier required the plain prefix is rejected',
      config: { eventDefinitionQualifier: 'required' },
      moddleElement: model({
        shapes: [
          { id: 'startEvent_membershipRequested', tag: 'startEvent', eventDefinitions: ['timer'] },
        ],
      }),
      report: {
        id: 'startEvent_membershipRequested',
        message: 'Element id must match the naming convention <timerStartEvent_camelCase>',
      },
    },
  ],
});
