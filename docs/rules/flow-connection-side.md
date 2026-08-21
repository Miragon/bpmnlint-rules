# `@miragon/rules/flow-connection-side`

> This rule is a non-blocking `warn` in both `plugin:@miragon/rules/recommended-for-modeling` and `plugin:@miragon/rules/recommended-for-automation`. In `plugin:@miragon/rules/all` it is an `error`. Override it to `warn`, `error` or `off` yourself.

Reports a sequence flow that docks onto a shape at the **wrong side**: an event entered from the
top, an activity exited to the left, or a gateway connected on a diagonal flank instead of one of
its four tips.

## Why

A BPMN diagram is the shared picture a modeler, a reviewer and a business stakeholder read to follow
the process, and it reads cleanly only when it flows left to right: the main path enters a shape on
the left and leaves on the right, and gateways branch through the tips of their diamond. When a flow
attaches somewhere else the reader has to stop and trace where each arrow actually lands to see the
path, even though the semantics (source, target) are perfectly valid.

## Why this matters for agentic BPMN

Agents and auto-layout write DI coordinates directly. They get the connection _right_ semantically
but dock the edge wherever the maths lands: into the top of a task, out of the left of a gateway,
onto the slanted flank of a diamond. The XML review looks clean; only the drawn diagram shows the
mess, and a reader (or a downstream layout pass) can no longer tell the main path from a branch.

**Typical AI artifact without this rule:** a flow that enters an activity from above or a gateway on
its diagonal edge: semantically fine, visually unreadable.

**What this rule guarantees:** every sequence flow attaches at a side that matches the element and
the flow direction, so the rendered model reads as a left-to-right process.

## Scope

Only the **DI coordinates** decide: for each sequence flow, the first waypoint is its exit off the
source, the last waypoint its entry into the target. The docking side is compared against a fixed
per-direction, per-type policy:

| Element      | Incoming (target) | Outgoing (source)                       |
| ------------ | ----------------- | --------------------------------------- |
| **Event**    | left              | top, right or bottom (any but left)     |
| **Activity** | left              | right                                   |
| **Gateway**  | any of its 4 tips | top, right or bottom (any tip but left) |

The main flow always enters on the left. An activity exits to the right; an **event** may branch its
outgoing flow out any side except the incoming-left one, the same freedom a gateway has. A gateway
is a diamond, so its only clean anchors are the four tips (the midpoints of its bounding box); a
point on a diagonal flank is reported as a diagonal connection.

### Return flows

A **return flow** is a loop-back edge whose target is drawn clearly left of its source (decided from
the two shapes' horizontal centres). It reads right-to-left, so its policy is **mirrored left ↔
right**: it may be entered from the **right** and leave to the **left**. The table above is applied
with `left` and `right` swapped, `top`/`bottom` unchanged. The docking is still checked, so a return
flow that wraps into the wrong face (e.g. enters an activity from the left) is still reported. A
near-vertical loop whose target sits in roughly the same column as its source is not treated as a
return flow, so it keeps the strict left-to-right policy.

Comparison is scoped per `BPMNPlane`. Left alone: shapes with no category (pools, lanes, data
objects), **boundary events** (they sit on their host's border, so a flow leaving one may dock at any
side), and any docking point too ambiguous to classify (exactly on a corner). These are never
guessed, to avoid false positives.

## Configuration

```jsonc
"@miragon/rules/flow-connection-side": ["error", { "allowBackwardsFlow": false }]
```

| Option               | Default | Effect                                                                                                                                                                                                      |
| -------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowBackwardsFlow` | `true`  | Mirror the policy for return flows (see above). Set to `false` to hold **every** flow to the strict left-to-right policy, so a return flow's docking is then reported like any other wrong-side connection. |

## Examples

An order-approval process: start event, a review task, a split/merge gateway pair, two branch
tasks and an end event. The invalid model mis-docks one flow on **each** element type at once:

- **Gateway**: `flow_toDecision` lands on the diagonal flank of `gateway_approved` instead of a tip.
- **Activity**: `flow_approve` enters `userTask_approveOrder` from the top instead of the left.
- **Event**: `flow_done` enters `endEvent_orderHandled` from the top instead of the left.

👎 Invalid: three flows docked on the wrong side, one per element type

![Invalid model: flows docked on the wrong side of a gateway, a task and an event](./assets/flow-connection-side-invalid.svg)

👍 Valid: every flow docked on the right side, the whole process reading left to right

![Valid model: every flow docked on the correct side](./assets/flow-connection-side-valid.svg)

```xml
<!-- 👎 into the gateway's slanted edge, the task's top, the event's top -->
<bpmndi:BPMNEdge bpmnElement="flow_toDecision">
  <di:waypoint x="350" y="200" />
  <di:waypoint x="423" y="188" />
</bpmndi:BPMNEdge>
<bpmndi:BPMNEdge bpmnElement="flow_approve">
  <di:waypoint x="435" y="175" />
  <di:waypoint x="435" y="30" />
  <di:waypoint x="570" y="30" />
  <di:waypoint x="570" y="90" />
</bpmndi:BPMNEdge>
<bpmndi:BPMNEdge bpmnElement="flow_done">
  <di:waypoint x="740" y="200" />
  <di:waypoint x="790" y="200" />
  <di:waypoint x="790" y="232" />
</bpmndi:BPMNEdge>

<!-- 👍 into the gateway's left tip, the task's left edge, the event's left edge -->
<bpmndi:BPMNEdge bpmnElement="flow_toDecision">
  <di:waypoint x="350" y="200" />
  <di:waypoint x="410" y="200" />
</bpmndi:BPMNEdge>
<bpmndi:BPMNEdge bpmnElement="flow_approve">
  <di:waypoint x="435" y="175" />
  <di:waypoint x="435" y="130" />
  <di:waypoint x="520" y="130" />
</bpmndi:BPMNEdge>
<bpmndi:BPMNEdge bpmnElement="flow_done">
  <di:waypoint x="740" y="200" />
  <di:waypoint x="772" y="200" />
</bpmndi:BPMNEdge>
```

## Further reading

- [Camunda: Creating readable process models](https://docs.camunda.io/docs/components/best-practices/modeling/creating-readable-process-models/): the left-to-right layout guidance a mis-docked flow breaks.
