import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/flow-zigzag';
import { model } from '../support/model';
import type { ShapeSpec } from '../support/model';

// The rule decides on a flow's waypoints; the shapes only need to exist as anchors.
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

// A loop-back that wraps and then stair-steps home: down, left, up, left, up (four bends).
const WINDING_WRAP = [
  { x: 300, y: 140 },
  { x: 300, y: 260 },
  { x: 200, y: 260 },
  { x: 200, y: 230 },
  { x: 120, y: 230 },
  { x: 120, y: 140 },
];

verify('flow-zigzag', rule, {
  valid: [
    {
      name: 'a straight flow',
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
      name: 'a monotone staircase across rows (never doubles back)',
      moddleElement: model({
        shapes: ENDS,
        edges: [
          flowWith([
            { x: 200, y: 140 },
            { x: 300, y: 140 },
            { x: 300, y: 240 },
            { x: 400, y: 240 },
            { x: 400, y: 320 },
            { x: 500, y: 320 },
          ]),
        ],
      }),
    },
    {
      name: 'a monotone staircase whose rung drifts a few pixels (still orthogonal to the eye)',
      moddleElement: model({
        shapes: ENDS,
        edges: [
          flowWith([
            { x: 200, y: 140 },
            { x: 300, y: 140 },
            { x: 300, y: 240 },
            { x: 470, y: 236 }, // right, ~4px up drift on a ~170px rung — not a reversal
            { x: 470, y: 320 },
            { x: 500, y: 320 },
          ]),
        ],
      }),
    },
    {
      name: 'a clean loop-back that wraps in two bends',
      moddleElement: model({
        shapes: ENDS,
        edges: [
          flowWith([
            { x: 300, y: 140 },
            { x: 300, y: 260 },
            { x: 120, y: 260 },
            { x: 120, y: 140 },
          ]),
        ],
      }),
    },
    {
      name: 'a wider maxWrapBends tolerates a flow the default would flag',
      config: { maxWrapBends: 5 },
      moddleElement: model({ shapes: ENDS, edges: [flowWith(WINDING_WRAP)] }),
    },
  ],
  invalid: [
    {
      name: 'a loop-back that stair-steps home (four bends)',
      moddleElement: model({ shapes: ENDS, edges: [flowWith(WINDING_WRAP)] }),
      report: {
        id: 'flow_FromTo',
        message:
          'Sequence flow <flow_FromTo> winds back on itself instead of reaching its target directly; route it more directly',
      },
    },
    {
      name: 'a forward flow that doubles back on itself',
      moddleElement: model({
        shapes: ENDS,
        edges: [
          flowWith([
            { x: 200, y: 140 },
            { x: 300, y: 140 },
            { x: 300, y: 240 },
            { x: 250, y: 240 },
            { x: 250, y: 140 },
            { x: 500, y: 140 },
          ]),
        ],
      }),
      report: {
        id: 'flow_FromTo',
        message:
          'Sequence flow <flow_FromTo> winds back on itself instead of reaching its target directly; route it more directly',
      },
    },
  ],
});
