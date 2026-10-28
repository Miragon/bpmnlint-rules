# `@miragon/rules/c8-event-gateway`

> This rule is `an error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports an event-based gateway with fewer than two outgoing flows, or with a target Camunda 8 does not wait for.

## Why

An event-based gateway waits for the first of its events. Camunda 8 refuses to deploy a file in
which such a gateway has fewer than two outgoing flows, or leads to anything but a message, timer,
signal or conditional intermediate catch event. The engine counts the flows the gateway lists as
its `<bpmn:outgoing>` entries, so a file that leaves those entries out is refused as well.

## Scope

The rule looks at every event-based gateway of the executable processes of a Camunda 8 diagram. It
reports fewer than two outgoing sequence flows, fewer than two listed `<bpmn:outgoing>` entries, and
each target that is not an intermediate catch event with one message, timer, signal or conditional
definition. A receive task after the gateway is left to camunda-compat's
`event-based-gateway-target`.

## Examples

👎 Invalid: the event-based gateway leads to a task

![The event-based gateway leads to a task](./assets/c8-event-gateway-invalid.svg)

👍 Valid: the event-based gateway leads to a timer catch event

![The event-based gateway leads to a timer catch event](./assets/c8-event-gateway-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:eventBasedGateway id="gateway_paymentStatus" />
<bpmn:sequenceFlow sourceRef="gateway_paymentStatus" targetRef="task_remindCustomer" />
<bpmn:task id="task_remindCustomer" />
```

👍 right:

```xml
<bpmn:eventBasedGateway id="gateway_paymentStatus" />
<bpmn:sequenceFlow sourceRef="gateway_paymentStatus" targetRef="event_paymentOverdue" />
<bpmn:intermediateCatchEvent id="event_paymentOverdue">
  <bpmn:timerEventDefinition />
</bpmn:intermediateCatchEvent>
```

## Further reading

- [Camunda 8: Event-based gateways](https://docs.camunda.io/docs/components/modeler/bpmn/event-based-gateways/): the events a gateway may wait for.

## Related

- [`@miragon/rules/c8-message`](./c8-message.md): message names Camunda 8 refuses, also after an event-based gateway.
