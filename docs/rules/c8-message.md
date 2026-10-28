# `@miragon/rules/c8-message`

> This rule is `an error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports a FEEL message name on a process start event, and one message name twice among events Camunda 8 subscribes to together.

## Why

Camunda 8 opens a subscription for every message an instance waits for. A process start event needs
a static message name, because no instance exists yet to evaluate an expression. And the engine
refuses to deploy a file in which one message name occurs twice among events it subscribes to at
the same time: the boundary events of one activity (with the activity itself when it is a receive
task), the targets of one event-based gateway, the start events of the event sub-processes of one
scope, and the start events of a process.

## Scope

The rule looks at the executable processes of a Camunda 8 diagram, outside transactions. Message
names that are FEEL expressions are not compared. A catch event without a message, a message without
a name and a missing `zeebe:subscription` or correlation key are left to camunda-compat's
`message-reference` and `subscription`.

## Examples

👎 Invalid: two branches of an event-based gateway wait for the same message

![Two branches of an event-based gateway wait for the same message](./assets/c8-message-invalid.svg)

👍 Valid: the second branch waits for a timer

![The second branch waits for a timer](./assets/c8-message-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:intermediateCatchEvent id="event_paymentReceived">
  <bpmn:messageEventDefinition messageRef="message_paymentReceived" />
</bpmn:intermediateCatchEvent>
<bpmn:intermediateCatchEvent id="event_paymentReceivedByTransfer">
  <bpmn:messageEventDefinition messageRef="message_paymentReceived" />
</bpmn:intermediateCatchEvent>
```

👍 right:

```xml
<bpmn:intermediateCatchEvent id="event_paymentReceived">
  <bpmn:messageEventDefinition messageRef="message_paymentReceived" />
</bpmn:intermediateCatchEvent>
<bpmn:intermediateCatchEvent id="event_paymentOverdue">
  <bpmn:timerEventDefinition />
</bpmn:intermediateCatchEvent>
```

## Further reading

- [Camunda 8: Message events](https://docs.camunda.io/docs/components/modeler/bpmn/message-events/): how messages are correlated to subscriptions.

## Related

- [`@miragon/rules/c8-signal`](./c8-signal.md): the same checks for signals.
- [`@miragon/rules/c8-error`](./c8-error.md): the same checks for error codes.
