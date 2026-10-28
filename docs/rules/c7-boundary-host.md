# `@miragon/rules/c7-boundary-host`

> This rule is an `error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a boundary event attached to a compensation handler.

## Why

A compensation handler (`isForCompensation="true"`) only runs when an earlier activity is
compensated. Camunda 7 refuses to deploy a file in which a boundary event is attached to such a
handler, so a timer on the refund step stops the whole deployment, not only that step. camunda-compat
does not check it: the file passes its rules and fails at deploy.

## Scope

The rule looks at every boundary event in an executable process and reports it when its
`attachedToRef` is an activity with `isForCompensation="true"`. Boundary events on other
activities, and the compensation boundary event that links an activity to its handler, are left
alone. Non-executable processes and the content of ad-hoc sub-processes are skipped, as the engine
skips them.

## Examples

👎 Invalid: a timer boundary event on the compensation handler

![A compensation handler with a timer boundary event](./assets/c7-boundary-host-invalid.svg)

👍 Valid: the compensation handler without a boundary event

![A compensation handler without a boundary event](./assets/c7-boundary-host-valid.svg)

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

- [Camunda 7: Cancel and compensation events](https://docs.camunda.org/manual/latest/reference/bpmn20/events/cancel-and-compensation-events/): how compensation handlers are attached and triggered.

## Related

- [`@miragon/rules/c8-boundary-host`](./c8-boundary-host.md): the same check for Camunda 8.
