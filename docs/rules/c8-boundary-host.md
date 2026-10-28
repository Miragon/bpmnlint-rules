# `@miragon/rules/c8-boundary-host`

> This rule is an `error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports a boundary event attached to a compensation handler.

## Why

A compensation handler (`isForCompensation="true"`) only runs when an earlier activity is
compensated. Camunda 8 refuses to deploy a file in which a boundary event is attached to such a
handler, so a timer or error on the refund step stops the whole deployment, not only that step.
camunda-compat does not check it: the file passes its rules and fails at deploy.

## Scope

The rule looks at every boundary event of a Camunda 8 diagram and reports it when its
`attachedToRef` is an activity with `isForCompensation="true"`. Boundary events on other activities,
and the compensation boundary event that links an activity to its handler, are left alone.

## Examples

👎 Invalid: a timer boundary event on the compensation handler

![A compensation handler with a timer boundary event](./assets/c8-boundary-host-invalid.svg)

👍 Valid: the compensation handler without a boundary event

![A compensation handler without a boundary event](./assets/c8-boundary-host-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_refundCard" isForCompensation="true" />
<bpmn:boundaryEvent id="event_refundTimedOut" attachedToRef="serviceTask_refundCard">
  <bpmn:timerEventDefinition />
</bpmn:boundaryEvent>
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_refundCard" isForCompensation="true" />
```

## Further reading

- [Camunda 8: Compensation events](https://docs.camunda.io/docs/components/modeler/bpmn/compensation-events/): how compensation handlers are triggered.

## Related

- [`@miragon/rules/c7-boundary-host`](./c7-boundary-host.md): the same check for Camunda 7.
