import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/flow-through-element';
import { model } from '../support/model';
import type { EdgeSpec, ShapeSpec } from '../support/model';

// Three tasks in a row. task_B sits between A and C, so a straight flow from A to C at
// y=140 runs right through its body:
//
//   task_A (100,100)   task_B (250,100)   task_C (400,100)
//   |----- 100x80 -----|--- obstacle ---|----- 100x80 ----|
const ROW: ShapeSpec[] = [
  { id: 'task_A', x: 100, y: 100 },
  { id: 'task_B', x: 250, y: 100 },
  { id: 'task_C', x: 400, y: 100 },
];

const STRAIGHT_A_TO_C: EdgeSpec = {
  id: 'flow_AToC',
  source: 'task_A',
  target: 'task_C',
  waypoints: [
    { x: 200, y: 140 },
    { x: 400, y: 140 },
  ],
};

verify('flow-through-element', rule, {
  valid: [
    {
      name: 'nothing in the way',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 100, y: 100 },
          { id: 'task_B', x: 250, y: 300 },
          { id: 'task_C', x: 400, y: 100 },
        ],
        edges: [STRAIGHT_A_TO_C],
      }),
    },
    {
      name: 'flow routed around the obstacle',
      moddleElement: model({
        shapes: ROW,
        edges: [
          {
            id: 'flow_AToC',
            source: 'task_A',
            target: 'task_C',
            waypoints: [
              { x: 200, y: 140 },
              { x: 200, y: 50 },
              { x: 450, y: 50 },
              { x: 450, y: 100 },
            ],
          },
        ],
      }),
    },
    {
      // The rule must never report the shapes the flow legitimately starts and ends on.
      name: 'a flow may enter its own source and target',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 100, y: 100 },
          { id: 'task_C', x: 400, y: 100 },
        ],
        edges: [
          {
            id: 'flow_AToC',
            source: 'task_A',
            target: 'task_C',
            waypoints: [
              { x: 150, y: 140 },
              { x: 450, y: 140 },
            ],
          },
        ],
      }),
    },
    {
      // A boundary event sits ON its host's border, so the flow leaving it starts inside the
      // host's bounds. Reporting the host would make the rule fire on every attached event.
      name: 'a flow leaving a boundary event may cross its host activity',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 100, y: 100 },
          {
            id: 'event_Timeout',
            tag: 'boundaryEvent',
            attachedTo: 'task_A',
            x: 160,
            y: 162,
            width: 36,
            height: 36,
          },
          { id: 'task_C', x: 400, y: 100 },
        ],
        edges: [
          {
            id: 'flow_TimeoutToC',
            source: 'event_Timeout',
            target: 'task_C',
            waypoints: [
              { x: 178, y: 130 },
              { x: 400, y: 140 },
            ],
          },
        ],
      }),
    },
    {
      name: 'an expanded sub-process encloses flows rather than blocking them',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 100, y: 100 },
          {
            id: 'subProcess_Wrapper',
            tag: 'subProcess',
            isExpanded: true,
            x: 250,
            y: 60,
            width: 100,
            height: 160,
          },
          { id: 'task_C', x: 400, y: 100 },
        ],
        edges: [STRAIGHT_A_TO_C],
      }),
    },
    {
      name: 'decorative overlays (annotations, data objects) are passable',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 100, y: 100 },
          { id: 'annotation_Note', tag: 'textAnnotation', x: 250, y: 100 },
          {
            id: 'dataObject_Payload',
            tag: 'dataObjectReference',
            x: 300,
            y: 100,
            width: 36,
            height: 50,
          },
          { id: 'task_C', x: 400, y: 100 },
        ],
        edges: [STRAIGHT_A_TO_C],
      }),
    },
  ],

  invalid: [
    {
      name: 'flow routed straight through an unrelated task',
      moddleElement: model({ shapes: ROW, edges: [STRAIGHT_A_TO_C] }),
      report: {
        id: 'flow_AToC',
        message: 'Sequence flow is routed through element <task_B>',
      },
    },
    {
      // A collapsed sub-process is a task-sized box on the canvas, so unlike an expanded one
      // it really is an obstacle.
      name: 'a collapsed sub-process is an obstacle',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 100, y: 100 },
          { id: 'subProcess_Collapsed', tag: 'subProcess', isExpanded: false, x: 250, y: 100 },
          { id: 'task_C', x: 400, y: 100 },
        ],
        edges: [STRAIGHT_A_TO_C],
      }),
      report: {
        id: 'flow_AToC',
        message: 'Sequence flow is routed through element <subProcess_Collapsed>',
      },
    },
    {
      name: 'one flow crossing two shapes reports both, in plane order',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 100, y: 100 },
          { id: 'task_B', x: 250, y: 100 },
          { id: 'task_D', x: 380, y: 100, width: 60, height: 80 },
          { id: 'task_C', x: 500, y: 100 },
        ],
        edges: [
          {
            id: 'flow_AToC',
            source: 'task_A',
            target: 'task_C',
            waypoints: [
              { x: 200, y: 140 },
              { x: 500, y: 140 },
            ],
          },
        ],
      }),
      report: [
        {
          id: 'flow_AToC',
          message: 'Sequence flow is routed through element <task_B>',
        },
        {
          id: 'flow_AToC',
          message: 'Sequence flow is routed through element <task_D>',
        },
      ],
    },
  ],
});
