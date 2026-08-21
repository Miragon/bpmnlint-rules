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

Comparison is scoped per `BPMNPlane`. Left alone:

- Flows touching an **exempt element type** — by default **gateways** (a gateway is where a process
  branches, so its paths are _meant_ to leave and arrive above or below the row) and **boundary
  events** (they sit on their host's border and typically drop to a handler placed below). The list
  is configurable — see [Configuration](#configuration).
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

Add `bpmn:SubProcess` to silence the false positives an **expanded sub-process** produces: its
height is set by its contents and the flow docks at the inner main row near the top, so the
bounding-box centre — which this rule compares — sits in empty space and a perfectly horizontal flow
gets reported. (Because the match is inheritance-aware, this also covers `bpmn:Transaction` and
`bpmn:AdHocSubProcess`, and it exempts collapsed sub-processes too.)

Exempting the type is a **blunt workaround** — it drops the check for sub-processes entirely rather
than measuring them correctly. The proper fix — compare against the sub-process's **first inner
element** (or the flow's attachment point) instead of the box centre — is tracked in
[#19](https://github.com/Miragon/bpmnlint-rules/issues/19).

## Examples

An order-approval process — start event, a review task, a split/merge gateway pair with two branch
tasks, an **expanded "Archive order" sub-process** and an end event. A sub-process is checked like any
other step (it is not exempt by default), and the rule measures **box centres** — so the sub-process's
box centre has to land on the row.

Both models below draw `flow_archived` **dead straight** along the row (`y=200`); the inner "Store
record" step sits on that same line. The only difference is the sub-process's height:

- 👎 **Invalid** — the "Archive order" sub-process holds more, so its box is taller and its centre
  drifts below the row. The rule compares centres and reports `flow_archived` — **even though the flow
  never moved and is still perfectly horizontal.** This is the false positive `exemptTypes` suppresses
  (see [Configuration](#configuration)); measuring against the sub-process's first inner element
  instead of the box centre — tracked in [#19](https://github.com/Miragon/bpmnlint-rules/issues/19) —
  would fix it properly.
- 👍 **Valid** — the sub-process is a modest height, so its box centre sits on the row. Centres match,
  nothing is reported, and the main path reads as one straight horizontal line. The gateway branches
  (up to _approve_, down to _reject_) are never judged.

👎 Invalid — a taller Archive sub-process drops its centre below the row, so the straight flow is still reported

![Invalid model — a taller "Archive order" sub-process whose box centre falls below the row, so the straight flow is reported](./assets/flow-target-alignment-invalid.svg)

👍 Valid — the Archive sub-process centre is on the row, the main path straight

![Valid model — the "Archive order" sub-process sits on the row and the main path reads as one straight horizontal line](./assets/flow-target-alignment-valid.svg)

```xml
<!-- 👎 taller sub-process, box centre y=225 — 25px below the row — so the straight flow is reported -->
<bpmndi:BPMNShape bpmnElement="subProcess_archiveOrder" isExpanded="true">
  <dc:Bounds x="760" y="120" width="340" height="210" />
</bpmndi:BPMNShape>
<bpmndi:BPMNEdge bpmnElement="flow_archived">
  <di:waypoint x="1100" y="200" />
  <di:waypoint x="1162" y="200" />
</bpmndi:BPMNEdge>

<!-- 👍 modest sub-process, box centre y=200 on the row: the same straight flow passes -->
<bpmndi:BPMNShape bpmnElement="subProcess_archiveOrder" isExpanded="true">
  <dc:Bounds x="790" y="120" width="360" height="160" />
</bpmndi:BPMNShape>
<bpmndi:BPMNEdge bpmnElement="flow_archived">
  <di:waypoint x="1150" y="200" />
  <di:waypoint x="1210" y="200" />
</bpmndi:BPMNEdge>
```

## Further reading

- [Camunda — Creating readable process models](https://docs.camunda.io/docs/components/best-practices/modeling/creating-readable-process-models/) — the left-to-right, straight-main-path layout guidance a sloping flow breaks.
