# `@miragon/rules/c8-signal`

> This rule is `an error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports a FEEL signal name on a start event, and one signal name twice on the start events of a process or the boundary events of one activity.

## Why

Camunda 8 subscribes to a start event's signal when the process is deployed, so the name must be
static. The engine also refuses to deploy a file in which two start events of a process, or two
boundary events of one activity, wait for the same signal name: a broadcast would trigger both.

## Scope

The rule looks at the executable processes of a Camunda 8 diagram, outside transactions. Signal
names that are FEEL expressions are not compared. An event without a signal and a signal without a
name are left to camunda-compat's `signal-reference`.

## Examples

👎 Invalid: two boundary events of one task wait for the same signal

![Two boundary events of one task wait for the same signal](./assets/c8-signal-invalid.svg)

👍 Valid: the boundary events wait for different signals

![The boundary events wait for different signals](./assets/c8-signal-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:boundaryEvent id="event_shippingStopped" attachedToRef="serviceTask_shipOrder">
  <bpmn:signalEventDefinition signalRef="signal_shippingStopped" />
</bpmn:boundaryEvent>
<bpmn:boundaryEvent id="event_recallIssued" attachedToRef="serviceTask_shipOrder">
  <bpmn:signalEventDefinition signalRef="signal_shippingStopped" />
</bpmn:boundaryEvent>
```

👍 right:

```xml
<bpmn:boundaryEvent id="event_shippingStopped" attachedToRef="serviceTask_shipOrder">
  <bpmn:signalEventDefinition signalRef="signal_shippingStopped" />
</bpmn:boundaryEvent>
<bpmn:boundaryEvent id="event_recallIssued" attachedToRef="serviceTask_shipOrder">
  <bpmn:signalEventDefinition signalRef="signal_recallIssued" />
</bpmn:boundaryEvent>
```

## Further reading

- [Camunda 8: Signal events](https://docs.camunda.io/docs/components/modeler/bpmn/signal-events/): where signals can start and interrupt.

## Related

- [`@miragon/rules/c8-message`](./c8-message.md): the same checks for messages.
