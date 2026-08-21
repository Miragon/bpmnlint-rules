import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/flow-crossing';
import { model } from '../support/model';
import type { ShapeSpec } from '../support/model';

// Four independent tasks the crossing flows connect, so no pair shares a node.
const FOUR_TASKS: ShapeSpec[] = [
  { id: 'task_a', x: 100, y: 100 },
  { id: 'task_b', x: 100, y: 300 },
  { id: 'task_c', x: 400, y: 100 },
  { id: 'task_d', x: 400, y: 300 },
];

verify('flow-crossing', rule, {
  valid: [
    {
      name: 'two parallel flows never cross',
      moddleElement: model({
        shapes: FOUR_TASKS,
        edges: [
          {
            id: 'flow_ac',
            source: 'task_a',
            target: 'task_c',
            waypoints: [
              { x: 200, y: 140 },
              { x: 400, y: 140 },
            ],
          },
          {
            id: 'flow_bd',
            source: 'task_b',
            target: 'task_d',
            waypoints: [
              { x: 200, y: 340 },
              { x: 400, y: 340 },
            ],
          },
        ],
      }),
    },
    {
      // The user explicitly allows two flows running on top of each other.
      name: 'collinear overlap is not a crossing',
      moddleElement: model({
        shapes: FOUR_TASKS,
        edges: [
          {
            id: 'flow_ac',
            source: 'task_a',
            target: 'task_c',
            waypoints: [
              { x: 100, y: 140 },
              { x: 400, y: 140 },
            ],
          },
          {
            id: 'flow_bd',
            source: 'task_b',
            target: 'task_d',
            waypoints: [
              { x: 200, y: 140 },
              { x: 500, y: 140 },
            ],
          },
        ],
      }),
    },
    {
      // Two flows leaving the same gateway would cross geometrically here, but a fan-out is never a
      // defect, so a pair sharing a node is skipped outright.
      name: 'flows sharing a node (fan-out) are skipped even when their segments cross',
      moddleElement: model({
        shapes: [
          { id: 'gateway_split', tag: 'exclusiveGateway', x: 175, y: 175, width: 50, height: 50 },
          { id: 'task_x', x: 400, y: 60 },
          { id: 'task_y', x: 400, y: 300 },
        ],
        edges: [
          {
            id: 'flow_splitToX',
            source: 'gateway_split',
            target: 'task_x',
            waypoints: [
              { x: 200, y: 100 },
              { x: 200, y: 300 },
            ],
          },
          {
            id: 'flow_splitToY',
            source: 'gateway_split',
            target: 'task_y',
            waypoints: [
              { x: 100, y: 200 },
              { x: 300, y: 200 },
            ],
          },
        ],
      }),
    },
    {
      // A flow whose endpoint merely lands on another flow's line (a T-junction) touches but does
      // not cross.
      name: 'a flow touching another at an endpoint is not a crossing',
      moddleElement: model({
        shapes: FOUR_TASKS,
        edges: [
          {
            id: 'flow_ac',
            source: 'task_a',
            target: 'task_c',
            waypoints: [
              { x: 100, y: 200 },
              { x: 300, y: 200 },
            ],
          },
          {
            id: 'flow_bd',
            source: 'task_b',
            target: 'task_d',
            waypoints: [
              { x: 200, y: 100 },
              { x: 200, y: 200 },
            ],
          },
        ],
      }),
    },
  ],

  invalid: [
    {
      name: 'two flows forming a diagonal X',
      moddleElement: model({
        shapes: FOUR_TASKS,
        edges: [
          {
            id: 'flow_ad',
            source: 'task_a',
            target: 'task_d',
            waypoints: [
              { x: 150, y: 140 },
              { x: 450, y: 340 },
            ],
          },
          {
            id: 'flow_cb',
            source: 'task_c',
            target: 'task_b',
            waypoints: [
              { x: 450, y: 140 },
              { x: 150, y: 340 },
            ],
          },
        ],
      }),
      report: [
        { id: 'flow_ad', message: 'Sequence flow crosses <flow_cb>' },
        { id: 'flow_cb', message: 'Sequence flow crosses <flow_ad>' },
      ],
    },
    {
      // A bent loop-back flow slicing across an unrelated branch, the defect from the reported model.
      name: 'a bent loop-back crossing an unrelated branch',
      moddleElement: model({
        shapes: FOUR_TASKS,
        edges: [
          {
            id: 'flow_branch',
            source: 'task_a',
            target: 'task_d',
            waypoints: [
              { x: 300, y: 100 },
              { x: 300, y: 400 },
            ],
          },
          {
            id: 'flow_loopBack',
            source: 'task_c',
            target: 'task_b',
            waypoints: [
              { x: 500, y: 250 },
              { x: 100, y: 250 },
              { x: 100, y: 340 },
            ],
          },
        ],
      }),
      report: [
        { id: 'flow_branch', message: 'Sequence flow crosses <flow_loopBack>' },
        { id: 'flow_loopBack', message: 'Sequence flow crosses <flow_branch>' },
      ],
    },
  ],
});
