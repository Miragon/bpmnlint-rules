import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/label-placement';
import { model } from '../support/model';
import type { EdgeSpec, ShapeSpec } from '../support/model';

// A start event at (100,100), 36×36, with its label below it, and a task to its right. The flow
// between them runs along y=118:
//
//   event_Start (100..136)  ---- flow_Start (y=118) ---->  task_Next (250..350, y 78..158)
//   label (75..161, y 143..157)
const START: ShapeSpec = {
  id: 'event_Start',
  tag: 'startEvent',
  name: 'Order received',
  x: 100,
  y: 100,
  width: 36,
  height: 36,
  label: { x: 75, y: 143, width: 86, height: 14 },
};

const NEXT: ShapeSpec = { id: 'task_Next', name: 'Check order', x: 250, y: 78 };

const FLOW: EdgeSpec = {
  id: 'flow_Start',
  source: 'event_Start',
  target: 'task_Next',
  waypoints: [
    { x: 136, y: 118 },
    { x: 250, y: 118 },
  ],
};

const labelOn = (spec: ShapeSpec, label: NonNullable<ShapeSpec['label']>): ShapeSpec => ({
  ...spec,
  label,
});

verify('label-placement', rule, {
  valid: [
    {
      name: 'a label below its event, clear of every flow and shape',
      moddleElement: model({ shapes: [START, NEXT], edges: [FLOW] }),
    },
    {
      name: 'a flow label above its flow',
      moddleElement: model({
        shapes: [START, NEXT],
        edges: [{ ...FLOW, name: 'Go', label: { x: 180, y: 100, width: 20, height: 14 } }],
      }),
    },
    {
      name: 'a label that only grazes a flow by a pixel',
      moddleElement: model({
        shapes: [START, NEXT],
        edges: [{ ...FLOW, name: 'Go', label: { x: 180, y: 103, width: 20, height: 14 } }],
      }),
    },
    {
      name: 'a label inside the expanded sub-process it belongs to',
      moddleElement: model({
        shapes: [
          {
            id: 'subProcess_Outer',
            tag: 'subProcess',
            x: 50,
            y: 50,
            width: 400,
            height: 200,
            isExpanded: true,
          },
          { ...START, parent: 'subProcess_Outer' },
        ],
      }),
    },
    {
      name: 'a boundary event label drawn over its host',
      moddleElement: model({
        shapes: [
          { id: 'task_Host', name: 'Ship order', x: 200, y: 100 },
          {
            id: 'event_Timeout',
            tag: 'boundaryEvent',
            name: 'Timeout',
            attachedTo: 'task_Host',
            x: 232,
            y: 82,
            width: 36,
            height: 36,
            label: { x: 225, y: 125, width: 50, height: 14 },
          },
        ],
      }),
    },
    {
      name: 'a label just wide enough for its longest word',
      moddleElement: model({
        shapes: [labelOn(START, { x: 97, y: 143, width: 42, height: 27 }), NEXT],
      }),
    },
    {
      name: 'a label without a name',
      moddleElement: model({
        shapes: [
          {
            id: 'event_Start',
            tag: 'startEvent',
            label: { x: 110, y: 143, width: 10, height: 14 },
          },
        ],
      }),
    },
    {
      name: 'a label that only grazes another shape by a pixel',
      moddleElement: model({
        shapes: [labelOn(START, { x: 75, y: 143, width: 176, height: 14 }), NEXT],
      }),
    },
    {
      name: 'a label drawn over a text annotation',
      moddleElement: model({
        shapes: [
          START,
          {
            id: 'textAnnotation_Note',
            tag: 'textAnnotation',
            x: 80,
            y: 140,
            width: 100,
            height: 30,
          },
        ],
      }),
    },
    {
      name: 'a flow label beside a vertical stretch of its own flow, as bpmn-js places it',
      moddleElement: model({
        shapes: [
          labelOn(START, { x: 140, y: 100, width: 86, height: 14 }),
          { ...NEXT, x: 68, y: 300 },
        ],
        edges: [
          {
            ...FLOW,
            name: 'Order rejected',
            waypoints: [
              { x: 118, y: 136 },
              { x: 118, y: 300 },
            ],
            label: { x: 98, y: 211, width: 70, height: 14 },
          },
        ],
      }),
    },
    {
      name: 'a hyphenated name breaks at the hyphen',
      moddleElement: model({
        shapes: [{ ...labelOn(START, { x: 98, y: 143, width: 29, height: 27 }), name: 'Re-check' }],
      }),
    },
    {
      name: 'a name with characters outside the known font metrics',
      moddleElement: model({
        shapes: [{ ...labelOn(START, { x: 113, y: 143, width: 10, height: 27 }), name: '受注' }],
      }),
    },
    {
      name: 'label bounds on a task, which bpmn-js ignores because it draws the name inside',
      moddleElement: model({
        shapes: [
          {
            ...NEXT,
            name: 'Check subscription',
            label: { x: 230, y: 111, width: 40, height: 27 },
          },
        ],
        edges: [],
      }),
    },
    {
      name: 'a label whose name is only whitespace',
      moddleElement: model({
        shapes: [{ ...labelOn(START, { x: 110, y: 143, width: 10, height: 14 }), name: '   ' }],
      }),
    },
    {
      name: 'a long compound that bpmn-js breaks even in a maxWidth-wide label',
      moddleElement: model({
        shapes: [
          {
            ...labelOn(START, { x: 74, y: 143, width: 89, height: 27 }),
            name: 'Versicherungsbedingungen geprüft',
          },
        ],
      }),
    },
    {
      name: 'a word only a label wider than the default maxWidth of 90px keeps whole',
      moddleElement: model({
        shapes: [
          {
            ...labelOn(START, { x: 88, y: 143, width: 60, height: 27 }),
            name: 'Recommendations received',
          },
        ],
      }),
    },
    {
      name: 'a word only a label one pixel wider than maxWidth keeps whole',
      config: { maxWidth: 61 },
      moddleElement: model({
        shapes: [
          {
            ...labelOn(START, { x: 88, y: 143, width: 61, height: 27 }),
            name: 'Subscription requested',
          },
        ],
      }),
    },
  ],
  invalid: [
    {
      name: 'a flow label drawn on top of its own flow',
      moddleElement: model({
        shapes: [START, NEXT],
        edges: [{ ...FLOW, name: 'Go', label: { x: 180, y: 111, width: 20, height: 14 } }],
      }),
      report: { id: 'flow_Start', message: 'Label overlaps sequence flow <flow_Start>' },
    },
    {
      name: 'an event label drawn over another task',
      moddleElement: model({
        shapes: [labelOn(START, { x: 230, y: 143, width: 86, height: 14 }), NEXT],
      }),
      report: { id: 'event_Start', message: 'Label overlaps element <task_Next>' },
    },
    {
      name: 'a label narrower than its longest word',
      moddleElement: model({
        shapes: [
          {
            ...labelOn(START, { x: 103, y: 143, width: 30, height: 40 }),
            name: 'Customer informed',
          },
        ],
      }),
      report: {
        id: 'event_Start',
        message:
          'Label is too narrow, so bpmn-js breaks the word "Customer"; widen it to at least 48px',
      },
    },
    {
      name: 'a word that fits on its own, but bpmn-js shortens the whole line by character count',
      moddleElement: model({
        shapes: [
          {
            ...labelOn(START, { x: 88, y: 143, width: 61, height: 27 }),
            name: 'Subscription requested',
          },
        ],
      }),
      report: {
        id: 'event_Start',
        message:
          'Label is too narrow, so bpmn-js breaks the word "Subscription"; widen it to at least 62px',
      },
    },
    {
      name: 'a word a label exactly as wide as the default maxWidth of 90px keeps whole',
      moddleElement: model({
        shapes: [
          {
            ...labelOn(START, { x: 88, y: 143, width: 60, height: 27 }),
            name: 'Acknowledgement received',
          },
        ],
      }),
      report: {
        id: 'event_Start',
        message:
          'Label is too narrow, so bpmn-js breaks the word "Acknowledgement"; widen it to at least 90px',
      },
    },
    {
      name: 'a word a label exactly maxWidth wide keeps whole',
      config: { maxWidth: 62 },
      moddleElement: model({
        shapes: [
          {
            ...labelOn(START, { x: 88, y: 143, width: 61, height: 27 }),
            name: 'Subscription requested',
          },
        ],
      }),
      report: {
        id: 'event_Start',
        message:
          'Label is too narrow, so bpmn-js breaks the word "Subscription"; widen it to at least 62px',
      },
    },
    {
      name: 'a long compound a raised maxWidth asks to keep whole',
      config: { maxWidth: 140 },
      moddleElement: model({
        shapes: [
          {
            ...labelOn(START, { x: 74, y: 143, width: 89, height: 27 }),
            name: 'Versicherungsbedingungen geprüft',
          },
        ],
      }),
      report: {
        id: 'event_Start',
        message:
          'Label is too narrow, so bpmn-js breaks the word "Versicherungsbedingungen"; widen it to at least 134px',
      },
    },
    {
      name: 'a flow label a fraction of a pixel narrower than its word',
      moddleElement: model({
        shapes: [START, NEXT],
        edges: [{ ...FLOW, name: 'yes', label: { x: 180, y: 100, width: 17, height: 14 } }],
      }),
      report: {
        id: 'flow_Start',
        message: 'Label is too narrow, so bpmn-js breaks the word "yes"; widen it to at least 18px',
      },
    },
    {
      name: 'a boundary event label drawn over a shape other than its host',
      moddleElement: model({
        shapes: [
          { id: 'task_Host', name: 'Ship order', x: 200, y: 100 },
          { id: 'task_Other', name: 'Notify', x: 200, y: 220 },
          {
            id: 'event_Timeout',
            tag: 'boundaryEvent',
            name: 'Timeout',
            attachedTo: 'task_Host',
            x: 232,
            y: 162,
            width: 36,
            height: 36,
            label: { x: 225, y: 215, width: 50, height: 14 },
          },
        ],
      }),
      report: { id: 'event_Timeout', message: 'Label overlaps element <task_Other>' },
    },
  ],
});
