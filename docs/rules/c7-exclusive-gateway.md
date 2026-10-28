# `@miragon/rules/c7-exclusive-gateway`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports an exclusive gateway whose outgoing flows Camunda 7 refuses to deploy.

## Why

Camunda 7 checks the outgoing flows of each exclusive gateway when it deploys a file. It refuses a
gateway without outgoing flow, a single outgoing flow with a condition, a default flow with a
condition, and flows without condition next to a default flow (or more than one of them without a
default). The diagram looks like an ordinary decision, so the mistake shows up only when the
deployment fails.

## Scope

The rule looks at the exclusive gateways of executable processes (not inside ad-hoc sub-processes)
and reports on the gateway:

- no outgoing flow,
- a single outgoing flow with a condition,
- a default flow with a condition, and
- each flow without condition that is not the default flow, when the gateway has a default flow
  or more than one such flow.

A gateway with one flow without condition and no default deploys. The engine takes that flow as
the default, which [`c7-implicit-default-flow`](./c7-implicit-default-flow.md) reports.

## Examples

👎 Invalid: the default flow "No" carries a condition

![An exclusive gateway whose default flow has a condition](./assets/c7-exclusive-gateway-invalid.svg)

👍 Valid: the condition is on "Yes" and "No" is the default flow

![An exclusive gateway with a condition and a default flow](./assets/c7-exclusive-gateway-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:exclusiveGateway id="gateway_orderApproved" default="flow_rejected" />
<bpmn:sequenceFlow id="flow_rejected" sourceRef="gateway_orderApproved" targetRef="endEvent_orderRejected">
  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${!approved}</bpmn:conditionExpression>
</bpmn:sequenceFlow>
```

👍 right:

```xml
<bpmn:exclusiveGateway id="gateway_orderApproved" default="flow_rejected" />
<bpmn:sequenceFlow id="flow_rejected" sourceRef="gateway_orderApproved" targetRef="endEvent_orderRejected" />
```

## Further reading

- [Camunda 7: Exclusive gateway](https://docs.camunda.org/manual/latest/reference/bpmn20/gateways/exclusive-gateway/): conditions and the default flow.

## Related

- [`@miragon/rules/c7-implicit-default-flow`](./c7-implicit-default-flow.md): one flow without condition and no default flow.
- [`@miragon/rules/c7-empty-condition`](./c7-empty-condition.md): a condition without expression.
