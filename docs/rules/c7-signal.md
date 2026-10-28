# `@miragon/rules/c7-signal`

> This rule is an `error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports signal events without a signal, signals without a name, two signal subscriptions with one
name in one scope, and two signals with one name.

## Why

Camunda 7 broadcasts and subscribes to signals by name. A signal event without `signalRef`, a
signal without a `name`, two subscriptions with one name in one scope, or two signal definitions
with one name each make the engine refuse the file at deploy. The duplicate name counts even when
one of the signals is unused.

## Scope

In executable processes the rule checks the signal definition the engine acts on of every signal
event (catching and throwing) for a `signalRef` with a `name`, and the signal subscriptions that
share a name in one engine scope: the start events of a process; the event sub-process start events
of a scope together with the boundary events on it; the boundary events of one activity. A
multi-instance activity's boundary events are a scope of their own. When the file has an executable
process, it also reports the second and later root signals with an already used name. Non-executable
processes and the content of ad-hoc sub-processes are skipped.

## Examples

👎 Invalid: a signal catch event without a signal

![A signal catch event without a signal](./assets/c7-signal-invalid.svg)

👍 Valid: the catch event waits for a named signal

![A signal catch event with a named signal](./assets/c7-signal-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:intermediateCatchEvent id="event_paymentCleared">
  <bpmn:signalEventDefinition />
</bpmn:intermediateCatchEvent>
```

👍 right:

```xml
<bpmn:signal id="signal_paymentCleared" name="paymentCleared" />
<bpmn:intermediateCatchEvent id="event_paymentCleared">
  <bpmn:signalEventDefinition signalRef="signal_paymentCleared" />
</bpmn:intermediateCatchEvent>
```

## Further reading

- [Camunda 7: Signal events](https://docs.camunda.org/manual/latest/reference/bpmn20/events/signal-events/): how signals are thrown and caught.

## Related

- [`@miragon/rules/c7-message`](./c7-message.md): the same checks for messages.
