# `@miragon/rules/c7-multiple-event-definitions`

> This rule is a `warning` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports an event with more than one event definition.

## Why

BPMN lets an event carry several triggers, but Camunda 7 acts on one of them and does not even
parse the others. A catch event with a message and a timer creates only the timer job: the message
never arrives, and nobody sees why in Cockpit. The file deploys, so the gap shows up only when the
ignored trigger was the one that mattered.

## Scope

The rule reports every event in an executable process with two or more event definitions. Where
the engine's choice is known (engine-checked for each pair, in both XML orders), the message names
the definition it acts on:

| Event                               | The first of these kinds present wins     |
| ----------------------------------- | ----------------------------------------- |
| intermediate catch event            | timer, signal, message, link, conditional |
| boundary event                      | timer, signal, message, conditional       |
| start event of a process            | timer, message, signal, conditional       |
| start event of an event sub-process | message, signal, timer, conditional       |
| intermediate throw event            | signal, message                           |
| end event                           | message, signal                           |

For any other combination the message says the engine acts on one of them. Non-executable processes
and the content of ad-hoc sub-processes are skipped.

## Examples

👎 Invalid: a catch event that waits for a message and a timer

![A catch event with a message and a timer definition](./assets/c7-multiple-event-definitions-invalid.svg)

👍 Valid: a catch event that waits for the message only

![A catch event with one message definition](./assets/c7-multiple-event-definitions-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:intermediateCatchEvent id="event_paymentReceived">
  <bpmn:messageEventDefinition messageRef="message_paymentReceived" />
  <bpmn:timerEventDefinition>
    <bpmn:timeDuration>PT1H</bpmn:timeDuration>
  </bpmn:timerEventDefinition>
</bpmn:intermediateCatchEvent>
```

👍 right:

```xml
<bpmn:intermediateCatchEvent id="event_paymentReceived">
  <bpmn:messageEventDefinition messageRef="message_paymentReceived" />
</bpmn:intermediateCatchEvent>
```

Model each further trigger as its own event, for example behind an event-based gateway.

## Further reading

- [Camunda 7: Events](https://docs.camunda.org/manual/latest/reference/bpmn20/events/): the event types and definitions the engine supports.

## Related

- [`@miragon/rules/c7-event-gateway`](./c7-event-gateway.md): the events an event-based gateway may wait for.
