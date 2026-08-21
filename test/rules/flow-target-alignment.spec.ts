import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/flow-target-alignment';
import { model } from '../support/model';

// Coordinates are the whole test. Only the vertical centre of each shape matters: a shape at (x, y)
// with height h has its centre at y + h/2. Default shapes are 100×80 (centre y+40); events are
// 36×36 (centre y+18), gateways 50×50 (centre y+25). Waypoints are irrelevant — the rule reads the
// shape bounds, so specs give edges a short stub segment.
//
//   task @ (_,100) 100×80  → centre y=140
//   event @ (_,122) 36×36  → centre y=140
//   gateway @ (_,115) 50×50 → centre y=140
//
// Which element types are left alone is configurable via `exemptTypes` (default gateways + boundary
// events). A case may pass a `config` to change it — see the sub-process cases below.

verify('flow-target-alignment', rule, {
  valid: [
    {
      // Textbook straight chain: event, task and end event all centred on the same row (y=140).
      name: 'a straight left-to-right chain on one row',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 122, width: 36, height: 36 },
          { id: 'task_Do', x: 200, y: 100 },
          { id: 'event_End', tag: 'endEvent', x: 360, y: 122, width: 36, height: 36 },
        ],
        edges: [
          { id: 'flow_StartToDo', source: 'event_Start', target: 'task_Do' },
          { id: 'flow_DoToEnd', source: 'task_Do', target: 'event_End' },
        ],
      }),
    },
    {
      // A gateway branches up and down by design, so a flow into or out of one is never judged —
      // even though the branch targets sit far off the main row.
      name: 'a gateway branching to targets at other heights',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 150, y: 100 },
          { id: 'gateway_Split', tag: 'exclusiveGateway', x: 300, y: 115, width: 50, height: 50 },
          { id: 'task_Up', x: 440, y: 20 },
          { id: 'task_Down', x: 440, y: 240 },
        ],
        edges: [
          { id: 'flow_AToSplit', source: 'task_A', target: 'gateway_Split' },
          { id: 'flow_SplitToUp', source: 'gateway_Split', target: 'task_Up' },
          { id: 'flow_SplitToDown', source: 'gateway_Split', target: 'task_Down' },
        ],
      }),
    },
    {
      // A boundary event sits on its host's border and drops to a handler below, so a flow leaving
      // one is exempt even though the handler is well off the source's row.
      name: 'a flow from a boundary event dropping to a handler below',
      moddleElement: model({
        shapes: [
          { id: 'task_Host', x: 200, y: 100 },
          {
            id: 'event_Timeout',
            tag: 'boundaryEvent',
            attachedTo: 'task_Host',
            x: 282,
            y: 142,
            width: 36,
            height: 36,
          },
          { id: 'task_Handle', x: 260, y: 300 },
        ],
        edges: [{ id: 'flow_TimeoutToHandle', source: 'event_Timeout', target: 'task_Handle' }],
      }),
    },
    {
      // Centres within the tolerance still count as the same row: a 36-tall event (centre 140) into
      // an 80-tall task nudged so its centre lands at 148 — 8px off, under the 10px tolerance.
      name: 'centres within the tolerance count as aligned',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 122, width: 36, height: 36 },
          { id: 'task_Do', x: 200, y: 108 },
        ],
        edges: [{ id: 'flow_StartToDo', source: 'event_Start', target: 'task_Do' }],
      }),
    },
    {
      // The #19 fix: a tall expanded sub-process is measured against its inner reading line, not its
      // box centre. Box centre is y=405 (way off the row), but the single inner start event is
      // centred on y=140 — the same row as the source event — so the horizontal flow is not reported.
      name: 'an expanded sub-process aligned by its inner start event, not its box centre',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 122, width: 36, height: 36 },
          {
            id: 'subProcess_Handle',
            tag: 'subProcess',
            x: 200,
            y: 80,
            height: 650,
            isExpanded: true,
          },
          {
            id: 'inner_Start',
            tag: 'startEvent',
            parent: 'subProcess_Handle',
            x: 240,
            y: 122,
            width: 36,
            height: 36,
          },
        ],
        edges: [{ id: 'flow_StartToHandle', source: 'event_Start', target: 'subProcess_Handle' }],
      }),
    },
    {
      // A sub-process with no inner start event is a smell owned by other rules (start-event-required
      // / sub-process-blank-start-event), so this rule skips it rather than measure a box centre it
      // can't trust. The box centre (405) is far off the row, yet nothing is reported.
      name: 'an expanded sub-process with no inner start event is skipped',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 122, width: 36, height: 36 },
          {
            id: 'subProcess_Handle',
            tag: 'subProcess',
            x: 200,
            y: 80,
            height: 650,
            isExpanded: true,
          },
          { id: 'inner_Task', parent: 'subProcess_Handle', x: 240, y: 400 },
        ],
        edges: [{ id: 'flow_StartToHandle', source: 'event_Start', target: 'subProcess_Handle' }],
      }),
    },
    {
      // Multiple inner start events is likewise a smell owned elsewhere; there is no single reading
      // line to measure, so the rule skips it — even though both inner starts sit off the source row.
      name: 'an expanded sub-process with multiple inner start events is skipped',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 122, width: 36, height: 36 },
          {
            id: 'subProcess_Handle',
            tag: 'subProcess',
            x: 200,
            y: 80,
            height: 650,
            isExpanded: true,
          },
          {
            id: 'inner_StartA',
            tag: 'startEvent',
            parent: 'subProcess_Handle',
            x: 240,
            y: 300,
            width: 36,
            height: 36,
          },
          {
            id: 'inner_StartB',
            tag: 'startEvent',
            parent: 'subProcess_Handle',
            x: 240,
            y: 500,
            width: 36,
            height: 36,
          },
        ],
        edges: [{ id: 'flow_StartToHandle', source: 'event_Start', target: 'subProcess_Handle' }],
      }),
    },
    {
      // A collapsed sub-process is a task-sized box, so its box centre IS the reading line and the
      // default box-centre comparison applies. Here the box centre (y=140) is on the source's row.
      name: 'a collapsed sub-process aligned by its box centre',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 122, width: 36, height: 36 },
          { id: 'subProcess_Handle', tag: 'subProcess', x: 200, y: 100, isExpanded: false },
        ],
        edges: [{ id: 'flow_StartToHandle', source: 'event_Start', target: 'subProcess_Handle' }],
      }),
    },
    {
      // Adding bpmn:SubProcess to the exempt list still drops the check entirely — the escape hatch
      // is unchanged. Here the inner start event is off the row (would otherwise be reported), but
      // exempting the type leaves the flow alone.
      name: 'an expanded sub-process is left alone once its type is exempt',
      config: { exemptTypes: ['bpmn:Gateway', 'bpmn:BoundaryEvent', 'bpmn:SubProcess'] },
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 122, width: 36, height: 36 },
          {
            id: 'subProcess_Handle',
            tag: 'subProcess',
            x: 200,
            y: 80,
            height: 650,
            isExpanded: true,
          },
          {
            id: 'inner_Start',
            tag: 'startEvent',
            parent: 'subProcess_Handle',
            x: 240,
            y: 400,
            width: 36,
            height: 36,
          },
        ],
        edges: [{ id: 'flow_StartToHandle', source: 'event_Start', target: 'subProcess_Handle' }],
      }),
    },
  ],

  invalid: [
    {
      name: 'a task whose target event is drawn below the row',
      moddleElement: model({
        shapes: [
          { id: 'task_Do', x: 200, y: 100 },
          { id: 'event_End', tag: 'endEvent', x: 360, y: 262, width: 36, height: 36 },
        ],
        edges: [{ id: 'flow_DoToEnd', source: 'task_Do', target: 'event_End' }],
      }),
      report: {
        id: 'flow_DoToEnd',
        message:
          "Sequence flow connects <task_Do> to <event_End> at a different height; an outgoing flow's target should sit at the same height as its source",
      },
    },
    {
      name: 'a task whose target task is drawn above the row',
      moddleElement: model({
        shapes: [
          { id: 'task_From', x: 200, y: 200 },
          { id: 'task_To', x: 360, y: 40 },
        ],
        edges: [{ id: 'flow_FromToTo', source: 'task_From', target: 'task_To' }],
      }),
      report: {
        id: 'flow_FromToTo',
        message:
          "Sequence flow connects <task_From> to <task_To> at a different height; an outgoing flow's target should sit at the same height as its source",
      },
    },
    {
      // A straight chain broken at exactly one point: start → receive → review are on the row, but
      // the flow into the dropped 'archive' task slopes down. Only that flow is reported.
      name: 'one flow off the row in an otherwise straight chain',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 122, width: 36, height: 36 },
          { id: 'task_Receive', x: 180, y: 100 },
          { id: 'task_Review', x: 340, y: 100 },
          { id: 'task_Archive', x: 500, y: 260 },
        ],
        edges: [
          { id: 'flow_StartToReceive', source: 'event_Start', target: 'task_Receive' },
          { id: 'flow_ReceiveToReview', source: 'task_Receive', target: 'task_Review' },
          { id: 'flow_ReviewToArchive', source: 'task_Review', target: 'task_Archive' },
        ],
      }),
      report: {
        id: 'flow_ReviewToArchive',
        message:
          "Sequence flow connects <task_Review> to <task_Archive> at a different height; an outgoing flow's target should sit at the same height as its source",
      },
    },
    {
      // An expanded sub-process genuinely off the row: its single inner start event (centre y=340)
      // sits well below the source event's row (y=140), so the flow into it slopes down and is
      // reported — regardless of where the box centre happens to land.
      name: 'an expanded sub-process whose inner start event is off the row',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 122, width: 36, height: 36 },
          {
            id: 'subProcess_Handle',
            tag: 'subProcess',
            x: 200,
            y: 280,
            height: 200,
            isExpanded: true,
          },
          {
            id: 'inner_Start',
            tag: 'startEvent',
            parent: 'subProcess_Handle',
            x: 240,
            y: 322,
            width: 36,
            height: 36,
          },
        ],
        edges: [{ id: 'flow_StartToHandle', source: 'event_Start', target: 'subProcess_Handle' }],
      }),
      report: {
        id: 'flow_StartToHandle',
        message:
          "Sequence flow connects <event_Start> to <subProcess_Handle> at a different height; an outgoing flow's target should sit at the same height as its source",
      },
    },
    {
      // A collapsed sub-process keeps box-centre behaviour: its box centre (y=340) is off the source
      // event's row (y=140), so the flow is reported just like any other task-sized box.
      name: 'a collapsed sub-process whose box centre is off the row',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 122, width: 36, height: 36 },
          { id: 'subProcess_Handle', tag: 'subProcess', x: 200, y: 300, isExpanded: false },
        ],
        edges: [{ id: 'flow_StartToHandle', source: 'event_Start', target: 'subProcess_Handle' }],
      }),
      report: {
        id: 'flow_StartToHandle',
        message:
          "Sequence flow connects <event_Start> to <subProcess_Handle> at a different height; an outgoing flow's target should sit at the same height as its source",
      },
    },
  ],
});
