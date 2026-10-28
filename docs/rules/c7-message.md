# `@miragon/rules/c7-message`

> This rule is an `error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports message catch events without a message, messages without a name, and two message
subscriptions with one name in one scope.

## Why

Camunda 7 correlates a message by its name. A catch event without `messageRef`, or a message
without a `name`, gives it nothing to subscribe to, and two subscriptions with one name in one scope
make correlation ambiguous. The engine refuses each of these files at deploy, so the whole process
stays undeployed until someone finds the event.

## Scope

In executable processes the rule checks:

- message start, intermediate catch and boundary events: the message definition the engine acts on
  needs a `messageRef`, and that message a `name`;
- receive tasks: a referenced message needs a `name` (a receive task without a message is allowed);
- subscriptions that share a message name in one engine scope: the start events of a process; the
  event sub-process start events of a scope together with the boundary events on it; the boundary
  events of one activity together with its own receive task message. A multi-instance activity's
  boundary events are a scope of their own.

Message throw and end events are left to their implementation rules. Non-executable processes and
the content of ad-hoc sub-processes are skipped.

## Examples

👎 Invalid: a message catch event without a message

![A message catch event without a message](./assets/c7-message-invalid.svg)

👍 Valid: the catch event waits for a named message

![A message catch event with a named message](./assets/c7-message-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:intermediateCatchEvent id="event_paymentReceived">
  <bpmn:messageEventDefinition />
</bpmn:intermediateCatchEvent>
```

👍 right:

```xml
<bpmn:message id="message_paymentReceived" name="paymentReceived" />
<bpmn:intermediateCatchEvent id="event_paymentReceived">
  <bpmn:messageEventDefinition messageRef="message_paymentReceived" />
</bpmn:intermediateCatchEvent>
```

## Further reading

- [Camunda 7: Message events](https://docs.camunda.org/manual/latest/reference/bpmn20/events/message-events/): how the engine subscribes to and correlates messages.

## Related

- [`@miragon/rules/c7-signal`](./c7-signal.md): the same checks for signals.
- [`@miragon/rules/c7-message-implementation`](./c7-message-implementation.md): the implementation of message throw events.
- [`@miragon/rules/message-name-naming`](./message-name-naming.md): the naming scheme of message names.
