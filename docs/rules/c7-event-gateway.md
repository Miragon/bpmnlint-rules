# `@miragon/rules/c7-event-gateway`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports an event-based gateway whose branches Camunda 7 refuses to deploy.

## Why

BPMN allows receive tasks and several kinds of catch events after an event-based gateway. Camunda 7
accepts only intermediate catch events that wait for a message, a timer, a signal or a condition.
It also refuses a catch event after the gateway that another flow enters, and two branches waiting
for the same message or signal name, because it could not tell which branch an incoming message
belongs to. In each case the whole file fails to deploy, although the diagram looks like a normal
race between events.

## Scope

The rule looks at the event-based gateways of executable processes (not inside ad-hoc
sub-processes) and reports, on the gateway, each branch that:

- is not an intermediate catch event (a receive task, a user task, a throw event),
- is a catch event that waits for none, more than one, or another kind of event (a link). Of
  several definitions the engine acts on one (a timer before a message), and that one decides,
- has other incoming flows, or
- waits for the same message or signal name as an earlier branch.

## Examples

👎 Invalid: a user task as a branch of the event-based gateway

![An event-based gateway with a user task branch](./assets/c7-event-gateway-invalid.svg)

👍 Valid: a message and a timer catch event as the branches

![An event-based gateway with a message and a timer branch](./assets/c7-event-gateway-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:eventBasedGateway id="gateway_paymentOutcome" />
<bpmn:userTask id="userTask_remindCustomer" />
<bpmn:sequenceFlow sourceRef="gateway_paymentOutcome" targetRef="userTask_remindCustomer" />
```

👍 right:

```xml
<bpmn:eventBasedGateway id="gateway_paymentOutcome" />
<bpmn:intermediateCatchEvent id="event_paymentOverdue">
  <bpmn:timerEventDefinition>
    <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">P14D</bpmn:timeDuration>
  </bpmn:timerEventDefinition>
</bpmn:intermediateCatchEvent>
<bpmn:sequenceFlow sourceRef="gateway_paymentOutcome" targetRef="event_paymentOverdue" />
```

## Further reading

- [Camunda 7: Event-based gateway](https://docs.camunda.org/manual/latest/reference/bpmn20/gateways/event-based-gateway/): which events may follow the gateway.

## Related

- [`@miragon/rules/c8-event-gateway`](./c8-event-gateway.md): the same check for Camunda 8.
- [`@miragon/rules/c7-multiple-event-definitions`](./c7-multiple-event-definitions.md): an event with several event definitions.
