import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/boundary-event-marker-overlap';
import { model, type ShapeSpec } from '../support/model';

// Every host sits at (200,100) and is 100×80 unless stated: bottom centre (250,180), top-left
// corner (200,100). A boundary event is a 36×36 circle named by the point its centre sits on.
//
//   marker row:      x 242..258 (single marker), y 160..173
//   task type icon:  x 205..226, y 105..123

const HOST_ID = 'activity_Host';
const BOTTOM_CENTRE = { x: 250, y: 180 };

const host = (spec: Partial<ShapeSpec>): ShapeSpec => ({ id: HOST_ID, x: 200, y: 100, ...spec });

const boundaryEventAt = (center: { x: number; y: number }): ShapeSpec => ({
  id: 'event_Boundary',
  tag: 'boundaryEvent',
  attachedTo: HOST_ID,
  x: center.x - 18,
  y: center.y - 18,
  width: 36,
  height: 36,
});

const covers = (label: string) => ({
  id: 'event_Boundary',
  message: `Boundary event covers the ${label} of <${HOST_ID}>; move it along the border`,
});

verify('boundary-event-marker-overlap', rule, {
  valid: [
    {
      name: 'the bottom centre of a plain task, which renders no marker',
      moddleElement: model({ shapes: [host({ tag: 'task' }), boundaryEventAt(BOTTOM_CENTRE)] }),
    },
    {
      name: 'the bottom centre of an expanded sub-process without markers',
      moddleElement: model({
        shapes: [host({ tag: 'subProcess', isExpanded: true }), boundaryEventAt(BOTTOM_CENTRE)],
      }),
    },
    {
      name: 'a call activity with the event moved 30 px right of its marker',
      moddleElement: model({
        shapes: [host({ tag: 'callActivity' }), boundaryEventAt({ x: 280, y: 180 })],
      }),
    },
    {
      name: 'the top edge of a call activity',
      moddleElement: model({
        shapes: [host({ tag: 'callActivity' }), boundaryEventAt({ x: 250, y: 100 })],
      }),
    },
    {
      name: 'the middle of the left edge of a service task, below its icon',
      moddleElement: model({
        shapes: [host({ tag: 'serviceTask' }), boundaryEventAt({ x: 200, y: 140 })],
      }),
    },
    {
      name: 'the top centre of a service task, right of its icon',
      moddleElement: model({
        shapes: [host({ tag: 'serviceTask' }), boundaryEventAt({ x: 250, y: 100 })],
      }),
    },
    {
      name: 'a boundary event whose host is not drawn',
      moddleElement: model({ shapes: [boundaryEventAt(BOTTOM_CENTRE)] }),
    },
  ],
  invalid: [
    {
      name: 'the bottom centre of a call activity',
      moddleElement: model({
        shapes: [host({ tag: 'callActivity' }), boundaryEventAt(BOTTOM_CENTRE)],
      }),
      report: covers('activity marker'),
    },
    {
      name: 'the bottom centre of a collapsed sub-process',
      moddleElement: model({
        shapes: [host({ tag: 'subProcess', isExpanded: false }), boundaryEventAt(BOTTOM_CENTRE)],
      }),
      report: covers('activity marker'),
    },
    {
      name: 'the bottom centre of a looping task',
      moddleElement: model({
        shapes: [host({ tag: 'task', hasLoop: true }), boundaryEventAt(BOTTOM_CENTRE)],
      }),
      report: covers('activity marker'),
    },
    {
      name: 'the bottom centre of an expanded ad-hoc sub-process',
      moddleElement: model({
        shapes: [
          host({ tag: 'adHocSubProcess', isExpanded: true, width: 300, height: 200 }),
          boundaryEventAt({ x: 350, y: 300 }),
        ],
      }),
      report: covers('activity marker'),
    },
    {
      // The loop marker sits left of the `+`, so the spot that is free on a plain call activity is taken.
      name: 'a looping call activity with the event 30 px left of centre',
      moddleElement: model({
        shapes: [host({ tag: 'callActivity', hasLoop: true }), boundaryEventAt({ x: 220, y: 180 })],
      }),
      report: covers('activity marker'),
    },
    {
      // The ad-hoc tilde sits right of the `+`.
      name: 'a collapsed ad-hoc sub-process with the event 30 px right of centre',
      moddleElement: model({
        shapes: [
          host({ tag: 'adHocSubProcess', isExpanded: false }),
          boundaryEventAt({ x: 280, y: 180 }),
        ],
      }),
      report: covers('activity marker'),
    },
    {
      name: 'the top-left of a service task',
      moddleElement: model({
        shapes: [host({ tag: 'serviceTask' }), boundaryEventAt({ x: 220, y: 100 })],
      }),
      report: covers('task type icon'),
    },
  ],
});
