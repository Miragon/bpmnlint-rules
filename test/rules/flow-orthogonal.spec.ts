import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/flow-orthogonal';
import { model } from '../support/model';
import type { ShapeSpec } from '../support/model';

// The rule decides purely on a flow's waypoints; the shapes only need to exist as anchors.
const ENDS: ShapeSpec[] = [
  { id: 'task_From', x: 100, y: 100 },
  { id: 'task_To', x: 500, y: 100 },
];

const flowWith = (waypoints: { x: number; y: number }[]) => ({
  id: 'flow_FromTo',
  source: 'task_From',
  target: 'task_To',
  waypoints,
});

verify('flow-orthogonal', rule, {
  valid: [
    {
      name: 'a straight horizontal flow',
      moddleElement: model({
        shapes: ENDS,
        edges: [
          flowWith([
            { x: 200, y: 140 },
            { x: 500, y: 140 },
          ]),
        ],
      }),
    },
    {
      name: 'an orthogonal L and staircase',
      moddleElement: model({
        shapes: ENDS,
        edges: [
          flowWith([
            { x: 200, y: 140 },
            { x: 350, y: 140 },
            { x: 350, y: 240 },
            { x: 500, y: 240 },
          ]),
        ],
      }),
    },
    {
      name: 'a few pixels of drift stays orthogonal',
      moddleElement: model({
        shapes: ENDS,
        edges: [
          flowWith([
            { x: 200, y: 140 },
            { x: 500, y: 143 },
          ]),
        ],
      }),
    },
  ],
  invalid: [
    {
      name: 'a single straight diagonal',
      moddleElement: model({
        shapes: [
          { id: 'task_From', x: 100, y: 100 },
          { id: 'task_To', x: 500, y: 260 },
        ],
        edges: [
          flowWith([
            { x: 200, y: 140 },
            { x: 500, y: 300 },
          ]),
        ],
      }),
      report: {
        id: 'flow_FromTo',
        message:
          'Sequence flow <flow_FromTo> runs diagonally; use only horizontal and vertical segments',
      },
    },
    {
      name: 'a slanted segment among orthogonal ones',
      moddleElement: model({
        shapes: ENDS,
        edges: [
          flowWith([
            { x: 200, y: 140 },
            { x: 200, y: 240 },
            { x: 400, y: 180 },
            { x: 500, y: 180 },
          ]),
        ],
      }),
      report: {
        id: 'flow_FromTo',
        message:
          'Sequence flow <flow_FromTo> runs diagonally; use only horizontal and vertical segments',
      },
    },
  ],
});
