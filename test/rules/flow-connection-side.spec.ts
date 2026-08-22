import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/flow-connection-side';
import { model } from '../support/model';

// Coordinates are the whole test. Default shapes are 100×80; events are 36×36, gateways 50×50, so a
// shape placed at (x, y) has its vertical centre at y + h/2 and its right edge at x + w.
//
//   task @ (200,100)  → left edge x=200 (y 100–180, mid 140), right edge x=300
//   event @ (_,122) 36×36 → centre y=140
//   gateway @ (300,115) 50×50 → tips: top(325,115) right(350,140) bottom(325,165) left(300,140)

verify('flow-connection-side', rule, {
  valid: [
    {
      // Textbook left-to-right chain: start event exits right, task in-left/out-right, end event
      // entered from the left.
      name: 'a clean left-to-right chain',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 122, width: 36, height: 36 },
          { id: 'task_Do', x: 200, y: 100 },
          { id: 'event_End', tag: 'endEvent', x: 360, y: 122, width: 36, height: 36 },
        ],
        edges: [
          {
            id: 'flow_StartToDo',
            source: 'event_Start',
            target: 'task_Do',
            waypoints: [
              { x: 136, y: 140 },
              { x: 200, y: 140 },
            ],
          },
          {
            id: 'flow_DoToEnd',
            source: 'task_Do',
            target: 'event_End',
            waypoints: [
              { x: 300, y: 140 },
              { x: 360, y: 140 },
            ],
          },
        ],
      }),
    },
    {
      // Gateway connects only at its tips: in at the left tip, out at the right tip and — branching —
      // out at the bottom tip into a task entered from the left.
      name: 'a gateway connected at its four tips',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 150, y: 100 },
          { id: 'gateway_Split', tag: 'exclusiveGateway', x: 300, y: 115, width: 50, height: 50 },
          { id: 'task_B', x: 420, y: 100 },
          { id: 'task_C', x: 420, y: 240 },
        ],
        edges: [
          {
            id: 'flow_AToSplit',
            source: 'task_A',
            target: 'gateway_Split',
            waypoints: [
              { x: 250, y: 140 },
              { x: 300, y: 140 },
            ],
          },
          {
            id: 'flow_SplitToB',
            source: 'gateway_Split',
            target: 'task_B',
            waypoints: [
              { x: 350, y: 140 },
              { x: 420, y: 140 },
            ],
          },
          {
            id: 'flow_SplitToC',
            source: 'gateway_Split',
            target: 'task_C',
            waypoints: [
              { x: 325, y: 165 },
              { x: 325, y: 280 },
              { x: 420, y: 280 },
            ],
          },
        ],
      }),
    },
    {
      // Incoming is allowed at the top, bottom or left tip — any tip but the forward-right one.
      name: 'a gateway entered at its top tip',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 300, y: 20 },
          { id: 'gateway_Join', tag: 'exclusiveGateway', x: 325, y: 140, width: 50, height: 50 },
        ],
        edges: [
          {
            id: 'flow_AToJoin',
            source: 'task_A',
            target: 'gateway_Join',
            waypoints: [
              { x: 400, y: 60 },
              { x: 440, y: 60 },
              { x: 440, y: 110 },
              { x: 350, y: 110 },
              { x: 350, y: 140 },
            ],
          },
        ],
      }),
    },
    {
      // A boundary event sits on its host's border, so the flow leaving it may dock at any side —
      // the rule leaves boundary events alone. Its target is still checked (entered from the left).
      name: 'a flow leaving a boundary event is not judged',
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
        edges: [
          {
            id: 'flow_TimeoutToHandle',
            source: 'event_Timeout',
            target: 'task_Handle',
            waypoints: [
              { x: 300, y: 178 },
              { x: 300, y: 260 },
              { x: 200, y: 260 },
              { x: 200, y: 340 },
              { x: 260, y: 340 },
            ],
          },
        ],
      }),
    },
    {
      // An ambiguous docking point — exactly on a corner, on two edges at once — is skipped rather
      // than guessed, so it never produces a false positive.
      name: 'a docking point on a corner is not reported',
      moddleElement: model({
        shapes: [
          { id: 'task_S', x: 340, y: 100 },
          { id: 'task_T', x: 500, y: 100 },
        ],
        edges: [
          {
            id: 'flow_SToT',
            source: 'task_S',
            target: 'task_T',
            waypoints: [
              { x: 440, y: 140 },
              { x: 500, y: 100 },
            ],
          },
        ],
      }),
    },
    {
      // An event's outgoing flow may leave any side but the incoming-left one — like a gateway.
      // Here a start event exits downward into a task entered from the left.
      name: 'an event may exit through a side other than the right',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 100, width: 36, height: 36 },
          { id: 'task_Do', x: 200, y: 200 },
        ],
        edges: [
          {
            id: 'flow_StartToDo',
            source: 'event_Start',
            target: 'task_Do',
            waypoints: [
              { x: 118, y: 136 },
              { x: 118, y: 240 },
              { x: 200, y: 240 },
            ],
          },
        ],
      }),
    },
    {
      // A full process touching every category: start event → task → split gateway → two branch
      // tasks → join gateway → end event. Events in-left/out-right, activities in-left/out-right,
      // gateways in at a tip (left / bottom) and out at a tip (right / bottom) — all clean.
      name: 'a complete process with events, gateways and activities all connected cleanly',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 122, width: 36, height: 36 },
          { id: 'task_Receive', x: 180, y: 100 },
          { id: 'gateway_Check', tag: 'exclusiveGateway', x: 330, y: 115, width: 50, height: 50 },
          { id: 'task_Approve', x: 440, y: 100 },
          { id: 'task_Reject', x: 440, y: 260 },
          { id: 'gateway_Join', tag: 'exclusiveGateway', x: 620, y: 115, width: 50, height: 50 },
          { id: 'event_End', tag: 'endEvent', x: 730, y: 122, width: 36, height: 36 },
        ],
        edges: [
          {
            id: 'flow_StartToReceive',
            source: 'event_Start',
            target: 'task_Receive',
            waypoints: [
              { x: 136, y: 140 },
              { x: 180, y: 140 },
            ],
          },
          {
            id: 'flow_ReceiveToCheck',
            source: 'task_Receive',
            target: 'gateway_Check',
            waypoints: [
              { x: 280, y: 140 },
              { x: 330, y: 140 },
            ],
          },
          {
            id: 'flow_CheckToApprove',
            source: 'gateway_Check',
            target: 'task_Approve',
            waypoints: [
              { x: 380, y: 140 },
              { x: 440, y: 140 },
            ],
          },
          {
            id: 'flow_CheckToReject',
            source: 'gateway_Check',
            target: 'task_Reject',
            waypoints: [
              { x: 355, y: 165 },
              { x: 355, y: 300 },
              { x: 440, y: 300 },
            ],
          },
          {
            id: 'flow_ApproveToJoin',
            source: 'task_Approve',
            target: 'gateway_Join',
            waypoints: [
              { x: 540, y: 140 },
              { x: 620, y: 140 },
            ],
          },
          {
            id: 'flow_RejectToJoin',
            source: 'task_Reject',
            target: 'gateway_Join',
            waypoints: [
              { x: 540, y: 300 },
              { x: 645, y: 300 },
              { x: 645, y: 165 },
            ],
          },
          {
            id: 'flow_JoinToEnd',
            source: 'gateway_Join',
            target: 'event_End',
            waypoints: [
              { x: 670, y: 140 },
              { x: 730, y: 140 },
            ],
          },
        ],
      }),
    },
    {
      // A return flow whose source *initiates* the loop-back (nothing points back to it) exits on
      // its normal forward side — the activity leaves to the right and wraps around into an upstream
      // gateway's tip. The reported real-world shape.
      name: 'a return flow initiator leaves the source right and wraps back into a gateway',
      moddleElement: model({
        shapes: [
          { id: 'gateway_Back', tag: 'exclusiveGateway', x: 100, y: 115, width: 50, height: 50 },
          { id: 'task_Init', x: 300, y: 100 },
        ],
        edges: [
          {
            id: 'flow_InitToBack',
            source: 'task_Init',
            target: 'gateway_Back',
            waypoints: [
              { x: 400, y: 140 },
              { x: 440, y: 140 },
              { x: 440, y: 40 },
              { x: 125, y: 40 },
              { x: 125, y: 115 },
            ],
          },
        ],
      }),
    },
    {
      // The same initiator shape between two activities: the source activity leaves to the right,
      // wraps up and over, and re-enters the target activity from the mirrored right side.
      name: 'a return flow initiator wraps from the right into an activity',
      moddleElement: model({
        shapes: [
          { id: 'task_Dest', x: 100, y: 100 },
          { id: 'task_Exit', x: 300, y: 100 },
        ],
        edges: [
          {
            id: 'flow_ExitToDest',
            source: 'task_Exit',
            target: 'task_Dest',
            waypoints: [
              { x: 400, y: 140 },
              { x: 440, y: 140 },
              { x: 440, y: 40 },
              { x: 240, y: 40 },
              { x: 240, y: 140 },
              { x: 200, y: 140 },
            ],
          },
        ],
      }),
    },
    {
      // The reported real-world shape: a gateway branches up-left into an intermediate event, which
      // loops back down-left into a merge gateway. Both edges run right-to-left, so their policy is
      // mirrored — the event is entered from the right and leaves to the left, the gateways connect
      // at their tips. All clean.
      name: 'a return loop back through a gateway and an event',
      moddleElement: model({
        shapes: [
          { id: 'gateway_Merge', tag: 'exclusiveGateway', x: 200, y: 115, width: 50, height: 50 },
          { id: 'event_Done', tag: 'intermediateCatchEvent', x: 300, y: 20, width: 36, height: 36 },
          {
            id: 'gateway_Decision',
            tag: 'exclusiveGateway',
            x: 400,
            y: 115,
            width: 50,
            height: 50,
          },
        ],
        edges: [
          {
            id: 'flow_DecisionToDone',
            source: 'gateway_Decision',
            target: 'event_Done',
            waypoints: [
              { x: 425, y: 115 },
              { x: 425, y: 38 },
              { x: 336, y: 38 },
            ],
          },
          {
            id: 'flow_DoneToMerge',
            source: 'event_Done',
            target: 'gateway_Merge',
            waypoints: [
              { x: 300, y: 38 },
              { x: 225, y: 38 },
              { x: 225, y: 115 },
            ],
          },
        ],
      }),
    },
    {
      // A return flow may re-enter a gateway from the right — the mirror of the forward-left face.
      // The branch wraps over the top and docks the merge gateway's right tip; the source activity
      // initiates the loop-back and exits its forward (right) side.
      name: 'a return flow re-enters a gateway from its right tip',
      moddleElement: model({
        shapes: [
          { id: 'gateway_Merge', tag: 'exclusiveGateway', x: 200, y: 115, width: 50, height: 50 },
          { id: 'task_Src', x: 400, y: 100 },
        ],
        edges: [
          {
            id: 'flow_SrcToMerge',
            source: 'task_Src',
            target: 'gateway_Merge',
            waypoints: [
              { x: 500, y: 140 },
              { x: 540, y: 140 },
              { x: 540, y: 60 },
              { x: 290, y: 60 },
              { x: 290, y: 140 },
              { x: 250, y: 140 },
            ],
          },
        ],
      }),
    },
    {
      // The reported real-world shape: an event-based gateway waits on a catch event drawn to its
      // left and looping back upstream. The branch leaves the gateway's mirrored *left* tip and runs
      // straight into the event's right face. The gateway is a return-flow initiator (nothing points
      // back to it), but as a branch point it may still dock a return branch on any tip.
      name: 'a return branch leaves a gateway through its mirrored left tip',
      moddleElement: model({
        shapes: [
          { id: 'gateway_Wait', tag: 'eventBasedGateway', x: 400, y: 115, width: 50, height: 50 },
          {
            id: 'event_Catch',
            tag: 'intermediateCatchEvent',
            x: 282,
            y: 122,
            width: 36,
            height: 36,
          },
        ],
        edges: [
          {
            id: 'flow_WaitToCatch',
            source: 'gateway_Wait',
            target: 'event_Catch',
            waypoints: [
              { x: 400, y: 140 },
              { x: 318, y: 140 },
            ],
          },
        ],
      }),
    },
    {
      // An intermediate event acting as a branch point: on a return flow it may leave its mirrored
      // left face into an upstream activity (entered, mirrored, from the right).
      name: 'a return branch leaves an intermediate event through its mirrored left tip',
      moddleElement: model({
        shapes: [
          {
            id: 'event_Branch',
            tag: 'intermediateThrowEvent',
            x: 400,
            y: 122,
            width: 36,
            height: 36,
          },
          { id: 'task_Back', x: 200, y: 100 },
        ],
        edges: [
          {
            id: 'flow_BranchToBack',
            source: 'event_Branch',
            target: 'task_Back',
            waypoints: [
              { x: 400, y: 140 },
              { x: 300, y: 140 },
            ],
          },
        ],
      }),
    },
    {
      // The union keeps the forward tips too: a gateway initiator may still leave its right tip on a
      // return flow and wrap up and over into the target's mirrored right face — allowing the left
      // tip must not forbid the classic wrap-around.
      name: 'a gateway initiator may still wrap out its right tip on a return flow',
      moddleElement: model({
        shapes: [
          { id: 'task_Loop', x: 100, y: 100 },
          { id: 'gateway_Dec', tag: 'exclusiveGateway', x: 400, y: 115, width: 50, height: 50 },
        ],
        edges: [
          {
            id: 'flow_DecToLoop',
            source: 'gateway_Dec',
            target: 'task_Loop',
            waypoints: [
              { x: 450, y: 140 },
              { x: 490, y: 140 },
              { x: 490, y: 40 },
              { x: 240, y: 40 },
              { x: 240, y: 140 },
              { x: 200, y: 140 },
            ],
          },
        ],
      }),
    },
    {
      // With `minStubLength: 0` the stub check is off: an edge may dock on the correct side and turn
      // immediately (0px stub) without being reported. The sides are still judged.
      name: 'a 0px stub is allowed when minStubLength is 0',
      config: { minStubLength: 0 },
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 100, y: 100 },
          { id: 'task_B', x: 300, y: 100 },
        ],
        edges: [
          {
            id: 'flow_AToB',
            source: 'task_A',
            target: 'task_B',
            waypoints: [
              { x: 200, y: 140 },
              { x: 200, y: 80 },
              { x: 280, y: 80 },
              { x: 280, y: 140 },
              { x: 300, y: 140 },
            ],
          },
        ],
      }),
    },
  ],

  invalid: [
    {
      name: 'an event entered from the top',
      moddleElement: model({
        shapes: [
          { id: 'task_Do', x: 200, y: 100 },
          { id: 'event_End', tag: 'endEvent', x: 360, y: 122, width: 36, height: 36 },
        ],
        edges: [
          {
            id: 'flow_DoToEnd',
            source: 'task_Do',
            target: 'event_End',
            waypoints: [
              { x: 300, y: 140 },
              { x: 378, y: 140 },
              { x: 378, y: 122 },
            ],
          },
        ],
      }),
      report: {
        id: 'flow_DoToEnd',
        message:
          'Sequence flow enters <event_End> from the top; an event must be entered from the left',
      },
    },
    {
      // A forward flow (target drawn right of its source) that wraps around into the target's right
      // face — the strict left-to-right policy applies, so this is reported.
      name: 'an activity entered from the right on a forward flow',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 100, y: 100 },
          { id: 'task_B', x: 300, y: 100 },
        ],
        edges: [
          {
            id: 'flow_AToB',
            source: 'task_A',
            target: 'task_B',
            waypoints: [
              { x: 200, y: 140 },
              { x: 230, y: 140 },
              { x: 230, y: 60 },
              { x: 450, y: 60 },
              { x: 450, y: 140 },
              { x: 400, y: 140 },
            ],
          },
        ],
      }),
      report: {
        id: 'flow_AToB',
        message:
          'Sequence flow enters <task_B> from the right; an activity must be entered from the left',
      },
    },
    {
      name: 'an activity exited to the left',
      moddleElement: model({
        shapes: [
          { id: 'task_Exit', x: 300, y: 100 },
          { id: 'task_Next', x: 450, y: 300 },
        ],
        edges: [
          {
            id: 'flow_ExitToNext',
            source: 'task_Exit',
            target: 'task_Next',
            waypoints: [
              { x: 300, y: 140 },
              { x: 250, y: 140 },
              { x: 250, y: 340 },
              { x: 450, y: 340 },
            ],
          },
        ],
      }),
      report: {
        id: 'flow_ExitToNext',
        message: 'Sequence flow leaves <task_Exit> to the left; an activity must exit to the right',
      },
    },
    {
      name: 'a gateway connected on a diagonal flank',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 180, y: 100 },
          { id: 'gateway_Split', tag: 'exclusiveGateway', x: 300, y: 115, width: 50, height: 50 },
        ],
        edges: [
          {
            id: 'flow_AToSplit',
            source: 'task_A',
            target: 'gateway_Split',
            waypoints: [
              { x: 280, y: 140 },
              { x: 313, y: 128 },
            ],
          },
        ],
      }),
      report: {
        id: 'flow_AToSplit',
        message:
          'Sequence flow connects to <gateway_Split> on a diagonal; a gateway must connect at one of its four tips',
      },
    },
    {
      name: 'a gateway exited back out its incoming (left) tip',
      moddleElement: model({
        shapes: [
          { id: 'gateway_Split', tag: 'exclusiveGateway', x: 300, y: 115, width: 50, height: 50 },
          { id: 'task_Back', x: 350, y: 300 },
        ],
        edges: [
          {
            id: 'flow_SplitToBack',
            source: 'gateway_Split',
            target: 'task_Back',
            waypoints: [
              { x: 300, y: 140 },
              { x: 300, y: 340 },
              { x: 350, y: 340 },
            ],
          },
        ],
      }),
      report: {
        id: 'flow_SplitToBack',
        message:
          'Sequence flow leaves <gateway_Split> to the left; a gateway must exit to the top, right or bottom',
      },
    },
    {
      // A forward flow that wraps over the top and docks the gateway's right tip. Right is the
      // forward-exit face, so entering there is reported — a gateway is entered from the top, bottom
      // or left. (A return flow re-entering from the right stays valid; that is the mirrored case.)
      name: 'a gateway entered from the right on a forward flow',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 180, y: 100 },
          { id: 'gateway_Join', tag: 'exclusiveGateway', x: 400, y: 115, width: 50, height: 50 },
        ],
        edges: [
          {
            id: 'flow_AToJoin',
            source: 'task_A',
            target: 'gateway_Join',
            waypoints: [
              { x: 280, y: 140 },
              { x: 340, y: 140 },
              { x: 340, y: 60 },
              { x: 450, y: 60 },
              { x: 450, y: 140 },
            ],
          },
        ],
      }),
      report: {
        id: 'flow_AToJoin',
        message:
          'Sequence flow enters <gateway_Join> from the right; a gateway must be entered from the top, bottom or left',
      },
    },
    {
      // A forward flow (target drawn right of its source) that still leaves the event's left face —
      // the strict left-to-right policy applies, so this is reported.
      name: 'an event exited to the left on a forward flow',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 300, y: 100, width: 36, height: 36 },
          { id: 'task_Right', x: 450, y: 100 },
        ],
        edges: [
          {
            id: 'flow_StartToRight',
            source: 'event_Start',
            target: 'task_Right',
            waypoints: [
              { x: 300, y: 118 },
              { x: 300, y: 40 },
              { x: 430, y: 40 },
              { x: 430, y: 140 },
              { x: 450, y: 140 },
            ],
          },
        ],
      }),
      report: {
        id: 'flow_StartToRight',
        message:
          'Sequence flow leaves <event_Start> to the left; an event must exit to the top, right or bottom',
      },
    },
    {
      // 👎 A return flow whose target is entered on the wrong face: it enters the activity from the
      // left instead of the mirrored right. The source is an initiator, so it leaves cleanly to the
      // right and wraps around — only the target end is reported.
      name: 'a return flow entering an activity from the left',
      moddleElement: model({
        shapes: [
          { id: 'task_From', x: 400, y: 100 },
          { id: 'task_To', x: 200, y: 100 },
        ],
        edges: [
          {
            id: 'flow_FromToTo',
            source: 'task_From',
            target: 'task_To',
            waypoints: [
              { x: 500, y: 140 },
              { x: 530, y: 140 },
              { x: 530, y: 60 },
              { x: 160, y: 60 },
              { x: 160, y: 140 },
              { x: 200, y: 140 },
            ],
          },
        ],
      }),
      report: {
        id: 'flow_FromToTo',
        message:
          'Sequence flow enters <task_To> from the left; an activity must be entered from the right',
      },
    },
    {
      // 👎 A return flow initiator (nothing points back to it) must exit its forward side. This one
      // leaves the activity to the left — a short direct return — so it is reported: it should exit
      // right and wrap around instead.
      name: 'a return flow initiator leaving an activity to the left',
      moddleElement: model({
        shapes: [
          { id: 'task_To', x: 200, y: 100 },
          { id: 'task_From', x: 400, y: 100 },
        ],
        edges: [
          {
            id: 'flow_FromToTo',
            source: 'task_From',
            target: 'task_To',
            waypoints: [
              { x: 400, y: 140 },
              { x: 300, y: 140 },
            ],
          },
        ],
      }),
      report: {
        id: 'flow_FromToTo',
        message: 'Sequence flow leaves <task_From> to the left; an activity must exit to the right',
      },
    },
    {
      // 👎 A return chain member — an activity that is itself the target of a return flow, so it sits
      // in the return lane — must exit on the mirrored (left) side. flow_BToA leaves task_B to the
      // right instead. flow_CToB is a clean initiator wrap-around, so only flow_BToA is reported.
      name: 'a return chain member leaving an activity to the right',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 100, y: 100 },
          { id: 'task_B', x: 250, y: 100 },
          { id: 'task_C', x: 400, y: 100 },
        ],
        edges: [
          {
            id: 'flow_CToB',
            source: 'task_C',
            target: 'task_B',
            waypoints: [
              { x: 500, y: 140 },
              { x: 530, y: 140 },
              { x: 530, y: 40 },
              { x: 390, y: 40 },
              { x: 390, y: 140 },
              { x: 350, y: 140 },
            ],
          },
          {
            id: 'flow_BToA',
            source: 'task_B',
            target: 'task_A',
            waypoints: [
              { x: 350, y: 140 },
              { x: 350, y: 220 },
              { x: 240, y: 220 },
              { x: 240, y: 140 },
              { x: 200, y: 140 },
            ],
          },
        ],
      }),
      report: {
        id: 'flow_BToA',
        message: 'Sequence flow leaves <task_B> to the right; an activity must exit to the left',
      },
    },
    {
      // 👎 A return flow initiator whose loopback exits the activity's bottom. An activity's only
      // forward exit is the right, so a bottom exit is reported (it should leave right and wrap).
      name: 'a return flow initiator leaving an activity to the bottom',
      moddleElement: model({
        shapes: [
          { id: 'task_Dst', x: 100, y: 100 },
          { id: 'task_Src', x: 300, y: 100 },
        ],
        edges: [
          {
            id: 'flow_SrcToDst',
            source: 'task_Src',
            target: 'task_Dst',
            waypoints: [
              { x: 350, y: 180 },
              { x: 350, y: 240 },
              { x: 260, y: 240 },
              { x: 260, y: 140 },
              { x: 200, y: 140 },
            ],
          },
        ],
      }),
      report: {
        id: 'flow_SrcToDst',
        message:
          'Sequence flow leaves <task_Src> to the bottom; an activity must exit to the right',
      },
    },
    {
      // 👎 A return flow entering an event from the left instead of the mirrored right. The source
      // is an initiator, so it leaves cleanly to the right and wraps around — only the target end is
      // reported.
      name: 'a return flow entering an event from the left',
      moddleElement: model({
        shapes: [
          { id: 'task_From', x: 300, y: 100 },
          { id: 'event_End', tag: 'endEvent', x: 120, y: 122, width: 36, height: 36 },
        ],
        edges: [
          {
            id: 'flow_FromToEnd',
            source: 'task_From',
            target: 'event_End',
            waypoints: [
              { x: 400, y: 140 },
              { x: 430, y: 140 },
              { x: 430, y: 60 },
              { x: 80, y: 60 },
              { x: 80, y: 140 },
              { x: 120, y: 140 },
            ],
          },
        ],
      }),
      report: {
        id: 'flow_FromToEnd',
        message:
          'Sequence flow enters <event_End> from the left; an event must be entered from the right',
      },
    },
    {
      // The same full process, but three flows mis-dock at their target — one per category: into a
      // gateway on a diagonal, into an activity from the top, into an event from the top. Every
      // source end and the other four flows stay clean, so exactly these three are reported.
      name: 'a complete process with a wrong-side connection on each element type',
      moddleElement: model({
        shapes: [
          { id: 'event_Start', tag: 'startEvent', x: 100, y: 122, width: 36, height: 36 },
          { id: 'task_Receive', x: 180, y: 100 },
          { id: 'gateway_Check', tag: 'exclusiveGateway', x: 330, y: 115, width: 50, height: 50 },
          { id: 'task_Approve', x: 440, y: 100 },
          { id: 'task_Reject', x: 440, y: 260 },
          { id: 'gateway_Join', tag: 'exclusiveGateway', x: 620, y: 115, width: 50, height: 50 },
          { id: 'event_End', tag: 'endEvent', x: 730, y: 122, width: 36, height: 36 },
        ],
        edges: [
          {
            id: 'flow_StartToReceive',
            source: 'event_Start',
            target: 'task_Receive',
            waypoints: [
              { x: 136, y: 140 },
              { x: 180, y: 140 },
            ],
          },
          {
            // 👎 enters the gateway on a diagonal flank instead of the left tip
            id: 'flow_ReceiveToCheck',
            source: 'task_Receive',
            target: 'gateway_Check',
            waypoints: [
              { x: 280, y: 140 },
              { x: 345, y: 127 },
            ],
          },
          {
            // 👎 enters the activity from the top instead of the left
            id: 'flow_CheckToApprove',
            source: 'gateway_Check',
            target: 'task_Approve',
            waypoints: [
              { x: 380, y: 140 },
              { x: 490, y: 140 },
              { x: 490, y: 100 },
            ],
          },
          {
            id: 'flow_CheckToReject',
            source: 'gateway_Check',
            target: 'task_Reject',
            waypoints: [
              { x: 355, y: 165 },
              { x: 355, y: 300 },
              { x: 440, y: 300 },
            ],
          },
          {
            id: 'flow_ApproveToJoin',
            source: 'task_Approve',
            target: 'gateway_Join',
            waypoints: [
              { x: 540, y: 140 },
              { x: 620, y: 140 },
            ],
          },
          {
            id: 'flow_RejectToJoin',
            source: 'task_Reject',
            target: 'gateway_Join',
            waypoints: [
              { x: 540, y: 300 },
              { x: 645, y: 300 },
              { x: 645, y: 165 },
            ],
          },
          {
            // 👎 enters the end event from the top instead of the left
            id: 'flow_JoinToEnd',
            source: 'gateway_Join',
            target: 'event_End',
            waypoints: [
              { x: 670, y: 140 },
              { x: 748, y: 140 },
              { x: 748, y: 122 },
            ],
          },
        ],
      }),
      report: [
        {
          id: 'flow_ReceiveToCheck',
          message:
            'Sequence flow connects to <gateway_Check> on a diagonal; a gateway must connect at one of its four tips',
        },
        {
          id: 'flow_CheckToApprove',
          message:
            'Sequence flow enters <task_Approve> from the top; an activity must be entered from the left',
        },
        {
          id: 'flow_JoinToEnd',
          message:
            'Sequence flow enters <event_End> from the top; an event must be entered from the left',
        },
      ],
    },
    {
      // With `allowBackwardsFlow: false` the mirror is switched off, so a return flow is held to the
      // strict left-to-right policy: the same clean loop-back that is valid by default now trips at
      // both ends — the source leaves to the left, the target is entered from the right.
      name: 'a return flow is reported when allowBackwardsFlow is off',
      config: { allowBackwardsFlow: false },
      moddleElement: model({
        shapes: [
          { id: 'task_To', x: 200, y: 100 },
          { id: 'task_From', x: 400, y: 100 },
        ],
        edges: [
          {
            id: 'flow_FromToTo',
            source: 'task_From',
            target: 'task_To',
            waypoints: [
              { x: 400, y: 140 },
              { x: 300, y: 140 },
            ],
          },
        ],
      }),
      report: [
        {
          id: 'flow_FromToTo',
          message:
            'Sequence flow leaves <task_From> to the left; an activity must exit to the right',
        },
        {
          id: 'flow_FromToTo',
          message:
            'Sequence flow enters <task_To> from the right; an activity must be entered from the left',
        },
      ],
    },
    {
      // 👎 Docks on the right side (allowed) but immediately turns up — a 0px stub, so the arrow
      // leaves the corner with no visible direction. The target end is entered from the left with a
      // proper stub, so only the source stub is reported.
      name: 'a flow that docks on the correct side but immediately turns',
      moddleElement: model({
        shapes: [
          { id: 'task_A', x: 100, y: 100 },
          { id: 'task_B', x: 300, y: 100 },
        ],
        edges: [
          {
            id: 'flow_AToB',
            source: 'task_A',
            target: 'task_B',
            waypoints: [
              { x: 200, y: 140 },
              { x: 200, y: 80 },
              { x: 280, y: 80 },
              { x: 280, y: 140 },
              { x: 300, y: 140 },
            ],
          },
        ],
      }),
      report: {
        id: 'flow_AToB',
        message:
          'Sequence flow leaves <task_A> to the right with only a 0px stub; it must run at least 20px straight out before turning',
      },
    },
  ],
});
