# `@miragon/rules/flow-id-names-ends`

> This rule is **off** in `plugin:@miragon/rules/recommended-for-modeling` (id conventions matter once a process is executable, not while modeling). It is a non-blocking `warn` in `plugin:@miragon/rules/recommended-for-automation` and an `error` in `plugin:@miragon/rules/all`. Set it to `warn`, `error` or `off` yourself to override.

Reports a sequence flow whose speaking id (`flow_<source>To<target>`) no longer names its source and target.

## Why

A speaking flow id is read as a fact about the graph. A process test that asserts
`hasPassed("flow_checkInvoiceToPaid")` and a reviewer reading a diff both trust that the flow runs
from the invoice check to the paid end. Once the flow is reconnected in a modeler or by hand, the id
keeps naming its old ends, and both of them are misled about which path the flow takes.

## Why this matters for agentic BPMN

An agent reads ids to understand a model before it changes it. A stale `flow_aToB` that really
runs to `C` makes it reason about the wrong path, and the XML review misses it because the id is
still well formed.

**Typical AI artifact without this rule:** a flow reconnected to a new end event that still
carries `flow_reviewToApproved`, while its target is `endEvent_rejected`.

**What this rule guarantees:** every speaking flow id names its current ends, so tests, diffs and
agents can trust it. The message suggests the expected id, so an agent fixes it in one step
(`bpmn set <file> <flowId> id=<newId>`).

## Scope

Only sequence flows whose id starts with the configured flow prefix and joins two parts with `To`.
An end counts as named by the part of its id after its prefix, by its name or by its prefix (`flow_resolveToGateway`). The match is lenient
so it never reports a correct id: either end may be cut short, and a collision suffix (`_2`,
`No2`) is ignored. Ids in other forms (`Flow_0yq6cfd`, `flow_approved`) are left to
[`element-id-naming`](./element-id-naming.md) and [`no-generated-ids`](./no-generated-ids.md).

## Configuration

Takes the same options as [`element-id-naming`](./element-id-naming.md), so repeat your
`prefixes` there when your flows use another prefix than `flow_`.

## Examples

👎 Invalid: the flow runs to the rejected end but its id names the approved one

![Invalid model: stale flow id](./assets/flow-id-names-ends-invalid.svg)

👍 Valid: every flow id names its current ends

![Valid model: flow ids name their ends](./assets/flow-id-names-ends-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:sequenceFlow id="flow_reviewToApproved" sourceRef="serviceTask_review" targetRef="endEvent_rejected" />
```

👍 right:

```xml
<bpmn:sequenceFlow id="flow_reviewToRejected" sourceRef="serviceTask_review" targetRef="endEvent_rejected" />
```

## Further reading

- [Camunda: Naming technically relevant IDs](https://docs.camunda.io/docs/components/best-practices/modeling/naming-technically-relevant-ids/): why ids are read by tests and people, not only by the engine.

## Related

- [`element-id-naming`](./element-id-naming.md): the form of every id, flows included.
