import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/label-alignment';
import { model } from '../support/model';
import type { ShapeSpec } from '../support/model';

// A start event at (100,100), 36×36, centred on (118,118), and an exclusive gateway at (300,93),
// 50×50, centred on (325,118). Their one-line labels (14px tall, as bpmn-js draws them) sit below
// and to the right of them, centred.
const EVENT: ShapeSpec = {
  id: 'event_Start',
  tag: 'startEvent',
  name: 'Order received',
  x: 100,
  y: 100,
  width: 36,
  height: 36,
  label: { x: 78, y: 143, width: 80, height: 14 },
};

const GATEWAY: ShapeSpec = {
  id: 'gateway_Complete',
  tag: 'exclusiveGateway',
  name: 'Order complete?',
  x: 300,
  y: 93,
  width: 50,
  height: 50,
  label: { x: 360, y: 111, width: 82, height: 14 },
};

const labelAt = (spec: ShapeSpec, x: number, y: number): ShapeSpec => ({
  ...spec,
  label: { ...spec.label!, x, y },
});

const below = (x: number) => model({ shapes: [labelAt(EVENT, x, 143)] });

verify('label-alignment', rule, {
  valid: [
    {
      name: 'an event label centred below its event',
      moddleElement: model({ shapes: [EVENT] }),
    },
    {
      name: 'an event label centred above its event',
      moddleElement: model({ shapes: [labelAt(EVENT, 78, 80)] }),
    },
    {
      name: 'a gateway label centred to the right of its gateway',
      moddleElement: model({ shapes: [GATEWAY] }),
    },
    {
      name: 'a gateway label centred to the left of its gateway',
      moddleElement: model({ shapes: [labelAt(GATEWAY, 208, 111)] }),
    },
    {
      name: 'a gateway label whose stored height bpmn-js replaces with the height of its one line',
      moddleElement: model({
        shapes: [{ ...GATEWAY, label: { x: 360, y: 111, width: 82, height: 40 } }],
      }),
    },
    {
      name: 'a label 2px off centre, within the tolerance',
      moddleElement: below(80),
    },
    {
      name: 'a label at a fractional position that bpmn-js rounds to 2px off centre',
      moddleElement: below(80.4),
    },
    {
      name: 'a label diagonally off a corner of its event',
      moddleElement: below(140),
    },
    {
      name: 'a label overlapping its own element',
      moddleElement: model({ shapes: [labelAt(EVENT, 90, 130)] }),
    },
    {
      name: 'a label without a name',
      moddleElement: model({
        shapes: [
          {
            id: 'event_Start',
            tag: 'startEvent',
            x: 100,
            y: 100,
            width: 36,
            height: 36,
            label: { x: 90, y: 143, width: 80, height: 14 },
          },
        ],
      }),
    },
    {
      name: 'an off-centre boundary event label',
      moddleElement: model({
        shapes: [
          { id: 'task_Host', name: 'Ship order', x: 200, y: 100 },
          {
            id: 'event_Timeout',
            tag: 'boundaryEvent',
            name: 'Timeout',
            attachedTo: 'task_Host',
            x: 232,
            y: 162,
            width: 36,
            height: 36,
            label: { x: 240, y: 205, width: 50, height: 14 },
          },
        ],
      }),
    },
    {
      name: 'label bounds on a task, which bpmn-js ignores because it draws the name inside',
      moddleElement: model({
        shapes: [
          {
            id: 'task_Check',
            name: 'Check order',
            x: 100,
            y: 100,
            label: { x: 140, y: 190, width: 60, height: 14 },
          },
        ],
      }),
    },
    {
      name: 'an off-centre label that would run into a flow leaving its event once centred',
      moddleElement: model({
        shapes: [labelAt(EVENT, 40, 143), { id: 'task_Next', name: 'Check order', x: 78, y: 250 }],
        edges: [
          {
            id: 'flow_Start',
            source: 'event_Start',
            target: 'task_Next',
            waypoints: [
              { x: 128, y: 134 },
              { x: 128, y: 250 },
            ],
          },
        ],
      }),
    },
    {
      name: 'an off-centre label that would overlap another label once centred',
      moddleElement: model({
        shapes: [
          labelAt(EVENT, 60, 143),
          {
            id: 'event_Other',
            tag: 'intermediateThrowEvent',
            name: 'Order noted',
            x: 170,
            y: 100,
            width: 36,
            height: 36,
            label: { x: 153, y: 143, width: 70, height: 14 },
          },
        ],
      }),
    },
    {
      name: 'an off-centre label that would run into an association once centred',
      moddleElement: model({
        shapes: [
          labelAt(EVENT, 40, 143),
          {
            id: 'textAnnotation_Note',
            tag: 'textAnnotation',
            text: 'Paper order',
            x: 100,
            y: 250,
            width: 100,
            height: 30,
          },
        ],
        edges: [
          {
            id: 'association_Note',
            tag: 'association',
            source: 'event_Start',
            target: 'textAnnotation_Note',
            waypoints: [
              { x: 128, y: 134 },
              { x: 128, y: 250 },
            ],
          },
        ],
      }),
    },
    {
      name: 'an off-centre label that would reach 3px into a neighbouring shape once centred',
      moddleElement: model({
        shapes: [labelAt(EVENT, 60, 143), { id: 'task_Next', name: 'Check order', x: 155, y: 140 }],
      }),
    },
    {
      name: 'an off-centre label that would overlap a data store once centred',
      moddleElement: model({
        shapes: [
          labelAt(EVENT, 60, 143),
          {
            id: 'dataStore_Orders',
            tag: 'dataStoreReference',
            x: 150,
            y: 140,
            width: 50,
            height: 50,
          },
        ],
      }),
    },
    {
      name: 'an off-centre data object label',
      moddleElement: model({
        shapes: [
          {
            id: 'dataObject_Order',
            tag: 'dataObjectReference',
            name: 'Order',
            x: 100,
            y: 100,
            width: 36,
            height: 50,
            label: { x: 115, y: 157, width: 30, height: 14 },
          },
        ],
      }),
    },
    {
      name: 'an off-centre label with characters outside the known font metrics',
      moddleElement: model({ shapes: [{ ...labelAt(EVENT, 90, 143), name: '受注' }] }),
    },
    {
      name: 'an off-centre label that would overlap a neighbouring shape once centred',
      moddleElement: model({
        shapes: [labelAt(EVENT, 60, 143), { id: 'task_Next', name: 'Check order', x: 150, y: 140 }],
      }),
    },
  ],
  invalid: [
    {
      name: 'an event label right of the centre below its event',
      moddleElement: below(85),
      report: {
        id: 'event_Start',
        message: 'Label is 7px right of the centre of its element; move it 7px left',
      },
    },
    {
      name: 'an event label left of the centre above its event',
      moddleElement: model({ shapes: [labelAt(EVENT, 73, 80)] }),
      report: {
        id: 'event_Start',
        message: 'Label is 5px left of the centre of its element; move it 5px right',
      },
    },
    {
      name: 'a gateway label above the centre to the right of its gateway',
      moddleElement: model({ shapes: [labelAt(GATEWAY, 360, 102)] }),
      report: {
        id: 'gateway_Complete',
        message: 'Label is 9px above the centre of its element; move it 9px down',
      },
    },
    {
      name: 'a two-line gateway label measured at the height bpmn-js draws, not the stored one',
      moddleElement: model({
        shapes: [{ ...GATEWAY, label: { x: 360, y: 111, width: 60, height: 14 } }],
      }),
      report: {
        id: 'gateway_Complete',
        message: 'Label is 6.5px below the centre of its element; move it 6.5px up',
      },
    },
    {
      name: 'a gateway label below the centre to the left of its gateway',
      moddleElement: model({ shapes: [labelAt(GATEWAY, 208, 115)] }),
      report: {
        id: 'gateway_Complete',
        message: 'Label is 4px below the centre of its element; move it 4px up',
      },
    },
    {
      name: 'a label just beyond the tolerance',
      moddleElement: model({
        shapes: [{ ...EVENT, label: { x: 81, y: 143, width: 79, height: 14 } }],
      }),
      report: {
        id: 'event_Start',
        message: 'Label is 2.5px right of the centre of its element; move it 2.5px left',
      },
    },
    {
      name: 'an event label far off centre that still shares the event range',
      moddleElement: below(120),
      report: {
        id: 'event_Start',
        message: 'Label is 42px right of the centre of its element; move it 42px left',
      },
    },
    {
      name: 'an off-centre label that would reach only 1px into a neighbouring shape once centred',
      moddleElement: model({
        shapes: [labelAt(EVENT, 60, 143), { id: 'task_Next', name: 'Check order', x: 157, y: 140 }],
      }),
      report: {
        id: 'event_Start',
        message: 'Label is 18px left of the centre of its element; move it 18px right',
      },
    },
    {
      name: 'an off-centre end event label',
      moddleElement: model({
        shapes: [{ ...labelAt(EVENT, 88, 143), id: 'event_End', tag: 'endEvent' }],
      }),
      report: {
        id: 'event_End',
        message: 'Label is 10px right of the centre of its element; move it 10px left',
      },
    },
  ],
});
