# `@miragon/rules/c7-empty-condition`

> This rule is `a warning` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a condition with no expression and no `camunda:resource` script.

## Why

Camunda 7 deploys an empty condition, and fails each time it evaluates it: an empty condition on a
sequence flow returns no boolean, and an empty conditional event never decides. The instance stops
with an incident at the gateway or task in front of the flow, often long after the deployment, and
the diagram shows an ordinary conditional flow.

## Scope

The rule looks at executable processes (not inside ad-hoc sub-processes) and reports:

- a sequence flow whose condition has neither expression text nor `camunda:resource`, when the
  engine evaluates it: default flows and flows out of parallel and event-based gateways are left
  alone, as their conditions are ignored, and
- a conditional event whose condition is empty in the same way. Of several event definitions only
  the one the engine acts on is checked.

A conditional event without any condition element is a schema error the engine refuses, reported
by [`c7-event-definition`](./c7-event-definition.md).

## Examples

👎 Invalid: the "Yes" flow has an empty condition

![An exclusive gateway with an empty condition](./assets/c7-empty-condition-invalid.svg)

👍 Valid: the "Yes" flow has an expression

![An exclusive gateway with a condition](./assets/c7-empty-condition-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:sequenceFlow id="flow_approved" sourceRef="gateway_orderApproved" targetRef="serviceTask_chargeCard">
  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression" />
</bpmn:sequenceFlow>
```

👍 right:

```xml
<bpmn:sequenceFlow id="flow_approved" sourceRef="gateway_orderApproved" targetRef="serviceTask_chargeCard">
  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${approved}</bpmn:conditionExpression>
</bpmn:sequenceFlow>
```

## Further reading

- [Camunda 7: Conditions](https://docs.camunda.org/manual/latest/user-guide/process-engine/expression-language/#conditions): how conditions are written as expressions or scripts.

## Related

- [`@miragon/rules/c7-exclusive-gateway`](./c7-exclusive-gateway.md): conditions on the flows of an exclusive gateway.
