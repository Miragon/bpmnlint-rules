# `@miragon/rules/flow-through-element`

> This rule is a non-blocking `warn` in both `plugin:@miragon/rules/recommended-for-modeling` and `plugin:@miragon/rules/recommended-for-automation`. In `plugin:@miragon/rules/all` it is an `error`. Override it to `warn`, `error` or `off` yourself.

Reports a sequence flow whose drawn path is routed **through the body** of a shape it does not
connect to.

## Why

The diagram is the artifact a reviewer signs off on and that downstream tooling parses, so it has to
match the semantics. A flow drawn straight through an unrelated task breaks that on both counts: the
reviewer reads a connection that is not there, and code reading the geometry can treat the
pass-through as a real link. bpmnlint's `no-overlapping-elements` does not catch it, because it only
compares shape-vs-shape bounds and never inspects edge geometry.

## Why this matters for agentic BPMN

Agents and auto-layout write DI coordinates directly instead of routing edges the way a modeler
does, so a flow is easily drawn straight across a shape it has nothing to do with. The semantics stay
untouched, so the XML diff looks clean and the defect slips through code review; it shows only once
the diagram is rendered.

**Typical AI artifact without this rule:** a re-routed sequence flow whose waypoints run through the
body of an unrelated task, invisible in the XML review and only obvious once the diagram is drawn.

**What this rule guarantees:** a sequence flow only ever passes through shapes it actually connects
to, keeping the rendered model faithful to its semantics and safe to process programmatically.

## What it does not report

Shapes a flow may legitimately pass over are excluded:

- **Enclosing containers**: pools, lanes, groups, and **expanded** sub-processes. A flow drawn
  "over" a container it lives inside is not a defect. A **collapsed** sub-process is a
  task-sized box and _is_ treated as an obstacle.
- **Boundary events and their host**: a boundary event sits on its host's border, so the flow
  leaving it starts inside the host's bounds.
- **Decorative overlays**: text annotations, groups, data objects and data stores.
- The flow's own source and target.

Container membership uses moddle **inheritance**, so `bpmn:Transaction` and
`bpmn:AdHocSubProcess` count as sub-processes.

## Known limitations

Left to visual review: a flow drawn over a text _label_, and message-flow / association routing.

## Examples

👎 Invalid: the `Reopen` loop-back is drawn straight through `serviceTask_assessTicket`, which it does not connect to

![Invalid model: a flow routed through an unrelated task](./assets/flow-through-element-invalid.svg)

👍 Valid: the same loop-back routed below the row, around every shape

![Valid model: the flow routed around the task](./assets/flow-through-element-valid.svg)

## Further reading

- [Camunda: Creating readable process models](https://docs.camunda.io/docs/components/best-practices/modeling/creating-readable-process-models/): the layout guidance a flow drawn through an unrelated shape breaks.
