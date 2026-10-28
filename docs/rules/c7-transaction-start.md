# `@miragon/rules/c7-transaction-start`

> This rule is a `warning` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a transaction without a start event.

## Why

Unlike an embedded sub-process, a transaction without a start event deploys on Camunda 7. Every
instance that reaches it then fails with "No initial activity found for subprocess", so the defect
surfaces as an incident in production instead of at deploy. An empty transaction fails the same way.

## Scope

The rule checks every transaction in an executable process, outside ad-hoc sub-processes. A
transaction whose only content is an event sub-process has no start event of its own and is
reported too. Embedded sub-processes without a start event are reported by
[`c7-start-event`](./c7-start-event.md), as the engine refuses them at deploy.

## Examples

👎 Invalid: an empty transaction

![An empty transaction](./assets/c7-transaction-start-invalid.svg)

👍 Valid: the transaction starts at its start event

![A transaction with a start event](./assets/c7-transaction-start-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:transaction id="subProcess_chargeCard" />
```

👍 right:

```xml
<bpmn:transaction id="subProcess_chargeCard">
  <bpmn:startEvent id="startEvent_chargeStarted" />
  <bpmn:serviceTask id="serviceTask_chargeCard" camunda:delegateExpression="${chargeCardDelegate}" />
  <bpmn:endEvent id="endEvent_cardCharged" />
  <bpmn:sequenceFlow id="flow_chargeStarted" sourceRef="startEvent_chargeStarted" targetRef="serviceTask_chargeCard" />
  <bpmn:sequenceFlow id="flow_cardCharged" sourceRef="serviceTask_chargeCard" targetRef="endEvent_cardCharged" />
</bpmn:transaction>
```

## Further reading

- [Camunda 7: Transaction subprocess](https://docs.camunda.org/manual/latest/reference/bpmn20/subprocesses/transaction-subprocess/): how a transaction runs.

## Related

- [`@miragon/rules/c7-start-event`](./c7-start-event.md): start events of processes and embedded sub-processes.
