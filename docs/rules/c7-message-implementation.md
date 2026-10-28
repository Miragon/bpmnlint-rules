# `@miragon/rules/c7-message-implementation`

> This rule is `a warning` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a message throw or end event without an implementation.

## Why

In Camunda 7 a message throw event sends nothing on its own: its message definition needs an
implementation, such as an external task topic or a delegate. Without one the file deploys and the
event behaves like a none event when the process runs, so the customer notification or partner call
the diagram shows never happens and nothing fails to tell anyone.

## Scope

The rule looks at the message definition of message intermediate throw and end events (of
several definitions, the one the engines act on). An implementation written on the event instead of
its definition is left to [`c7-misplaced-attribute`](./c7-misplaced-attribute.md), an unsupported
`camunda:type` to [`c7-implementation`](./c7-implementation.md). Only executable processes are checked, and nothing inside an ad-hoc sub-process, which the engines skip with its content.

## Examples

👎 Invalid: a message end event without an implementation

![A message end event without an implementation](./assets/c7-message-implementation-invalid.svg)

👍 Valid: the message end event calls a delegate

![The message end event calls a delegate](./assets/c7-message-implementation-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:endEvent id="endEvent_orderPaid" name="Order paid">
  <bpmn:messageEventDefinition />
</bpmn:endEvent>
```

👍 right:

```xml
<bpmn:endEvent id="endEvent_orderPaid" name="Order paid">
  <bpmn:messageEventDefinition camunda:delegateExpression="${notifyCustomerDelegate}" />
</bpmn:endEvent>
```

## Further reading

- [Camunda 7: Message events](https://docs.camunda.org/manual/latest/reference/bpmn20/events/message-events/): how a message throw event is implemented.

## Related

- [`@miragon/rules/c7-implementation`](./c7-implementation.md): tasks without an implementation.
