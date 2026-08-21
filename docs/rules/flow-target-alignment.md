# `@miragon/rules/flow-target-alignment`

> This rule is a non-blocking `warn` in both `plugin:@miragon/rules/recommended-for-modeling` and `plugin:@miragon/rules/recommended-for-automation`; in `plugin:@miragon/rules/all` it is an `error`. Override it to `warn`/`error`/`off` yourself.

Reports an outgoing sequence flow whose **target sits at a different height than its source**, so the
main path slopes up or down instead of reading as a straight horizontal line — **except** when a
gateway (or a boundary event) is involved, since those legitimately branch up and down.

## Why

A readable BPMN model flows left to right along a straight main path: each step is drawn on the same
row as the one before it, so the eye follows one horizontal line from start to end. When a flow's
target is drawn higher or lower than its source, that line bends into a diagonal or a zig-zag — the
model still means the same thing, but it no longer _reads_ as a single main path.

This is deliberately a **separate** concern from
[`flow-connection-side`](./flow-connection-side.md): that rule checks the _side_ a flow docks onto
(out right, in left, gateway tips). A model can dock every flow on the correct side and still slope,
because the target is simply drawn off the row. This rule catches exactly that.

## Why this matters for agentic BPMN

Agents and auto-layout write DI coordinates directly. They connect the right elements and often dock
on the right side, but place each shape wherever the maths lands — one task a hundred pixels lower
than the last. The XML review looks clean and even `flow-connection-side` passes; only the drawn
diagram shows the main path staircasing down the canvas.

**Typical AI artifact without this rule:** a straight sequence of tasks and events where each one is
nudged a little lower than the previous, so the "main flow" descends diagonally across the diagram.

**What this rule guarantees:** every non-branching sequence flow keeps its target on the same row as
its source, so the main path renders as one straight horizontal line.

## Scope

Only the **DI coordinates** decide: for each sequence flow, the vertical centre of the source shape
is compared against the vertical centre of the target shape. They must match within a small tolerance
(10px) to count as the same row.

**Expanded sub-processes** are measured against their inner reading line, not the box centre. A
sub-process's height is set by its contents, so its box centre lands in arbitrary empty space rather
than where the flow docks (the inner main row, near the top). Instead the rule uses the vertical
centre of the sub-process's **single inner `bpmn:StartEvent`** — the height the flow actually reads
from. A **collapsed** sub-process is a task-sized box, so its box centre _is_ the reading line and the
default applies.

Comparison is scoped per `BPMNPlane`. Left alone:

- Flows touching an **exempt element type** — by default **gateways** (a gateway is where a process
  branches, so its paths are _meant_ to leave and arrive above or below the row) and **boundary
  events** (they sit on their host's border and typically drop to a handler placed below). The list
  is configurable — see [Configuration](#configuration).
- Flows to/from an **expanded sub-process with no single inner start event** — none, or more than
  one, is a modelling smell owned by other rules (`bpmnlint:recommended`'s `start-event-required` /
  `sub-process-blank-start-event`), so there is no reading line to measure and this rule stays quiet
  rather than double-report.
- Flows with **no DI** for one of their ends — nothing to compare, so never guessed.

## Configuration

```json
{
  "rules": {
    "@miragon/rules/flow-target-alignment": [
      "error",
      {
        "exemptTypes": ["bpmn:Gateway", "bpmn:BoundaryEvent", "bpmn:SubProcess"]
      }
    ]
  }
}
```

- `exemptTypes` — the element types whose flows are never judged; matched inheritance-aware, so a
  type covers its subtypes. Given a value it **replaces** the default
  `["bpmn:Gateway", "bpmn:BoundaryEvent"]` entirely, so keep those unless you want branch and
  boundary flows reported.

Adding `bpmn:SubProcess` remains available as an escape hatch — it drops the check for sub-processes
entirely (and, because the match is inheritance-aware, `bpmn:Transaction` / `bpmn:AdHocSubProcess`
and collapsed sub-processes too). It is **no longer needed** for the expanded-sub-process false
positive: that is now measured against the inner start-event row rather than the box centre (see
[Scope](#scope)), so a horizontal flow into a tall sub-process is no longer reported.

## Examples

An order-approval process — start event, a review task, a split/merge gateway pair with two branch
tasks, an **expanded "Archive order" sub-process** and an end event. A sub-process is checked like any
other step (it is not exempt by default), but an expanded one is measured against the vertical centre
of its **inner start event** — the row the flow actually docks at — not its box centre.

Both sub-processes below are the same tall box; the only difference is where the inner reading line
sits:

- 👎 **Invalid** — the inner "Store record" row (and its `startEvent_archiveStarted`) is drawn well
  below the main row, so `flow_archived` has to step down to reach it. The reading line is off the
  neighbours' row, so the flow is reported — even though the box centre happens to sit near the row.
- 👍 **Valid** — the inner start event sits on the main row (`y=200`), so `flow_archived` reads dead
  straight and nothing is reported — **regardless of how tall the box is**. The gateway branches (up
  to _approve_, down to _reject_) are never judged.

👎 Invalid — the Archive sub-process's inner reading line is below the row, so the flow steps down and is reported

![Invalid model — the "Archive order" sub-process's inner start event sits below the main row, so the flow into it steps down and is reported](./assets/flow-target-alignment-invalid.svg)

👍 Valid — the Archive sub-process's inner start event is on the row, so the main path reads straight

![Valid model — the "Archive order" sub-process's inner start event sits on the main row, so the main path reads as one straight horizontal line](./assets/flow-target-alignment-valid.svg)

```xml
<!-- 👎 inner start event centre y=260 — off the row — so the flow into the sub-process is reported -->
<bpmndi:BPMNShape bpmnElement="subProcess_archiveOrder" isExpanded="true">
  <dc:Bounds x="760" y="90" width="430" height="240" />
</bpmndi:BPMNShape>
<bpmndi:BPMNShape bpmnElement="startEvent_archiveStarted">
  <dc:Bounds x="790" y="242" width="36" height="36" />
</bpmndi:BPMNShape>

<!-- 👍 same tall box, inner start event centre y=200 on the row: the flow reads straight and passes -->
<bpmndi:BPMNShape bpmnElement="subProcess_archiveOrder" isExpanded="true">
  <dc:Bounds x="790" y="120" width="360" height="210" />
</bpmndi:BPMNShape>
<bpmndi:BPMNShape bpmnElement="startEvent_archiveStarted">
  <dc:Bounds x="820" y="182" width="36" height="36" />
</bpmndi:BPMNShape>
```

## Further reading

- [Camunda — Creating readable process models](https://docs.camunda.io/docs/components/best-practices/modeling/creating-readable-process-models/) — the left-to-right, straight-main-path layout guidance a sloping flow breaks.
