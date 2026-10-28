# `@miragon/rules/c7-implicit-default-flow`

> This rule is `an info` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports an exclusive gateway without default flow whose outgoing flows all have a condition but one.

## Why

Camunda 7 deploys such a gateway and takes the flow without condition as the default, with a
warning in the engine log. The process runs, but the diagram does not say which branch is the
fallback: a reader sees two equal branches, and a later edit that adds a condition to the
unconditioned flow silently removes the fallback. Marking the flow as the default makes the
behavior visible in the diagram.

## Scope

The rule looks at the exclusive gateways of executable processes (not inside ad-hoc sub-processes)
with at least two outgoing flows and no default flow, and reports the gateway when exactly one of
them has no condition. More than one flow without condition is refused by the engine and reported
by [`c7-exclusive-gateway`](./c7-exclusive-gateway.md).

## Examples

👎 Invalid: "No" has no condition and is not the default flow

![An exclusive gateway without default flow](./assets/c7-implicit-default-flow-invalid.svg)

👍 Valid: "No" is the default flow

![An exclusive gateway with a default flow](./assets/c7-implicit-default-flow-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:exclusiveGateway id="gateway_orderApproved" />
```

👍 right:

```xml
<bpmn:exclusiveGateway id="gateway_orderApproved" default="flow_rejected" />
```

## Further reading

- [Camunda 7: Exclusive gateway](https://docs.camunda.org/manual/latest/reference/bpmn20/gateways/exclusive-gateway/): conditions and the default flow.

## Related

- [`@miragon/rules/c7-exclusive-gateway`](./c7-exclusive-gateway.md): the exclusive gateways Camunda 7 refuses.
