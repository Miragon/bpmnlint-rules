# `@miragon/rules/message-name-naming`

> This rule is **off** in `plugin:@miragon/rules/recommended-for-modeling` (id conventions matter once a process is executable, not while modeling). It is a non-blocking `warn` in `plugin:@miragon/rules/recommended-for-automation` and an `error` in `plugin:@miragon/rules/all`. Set it to `warn`, `error` or `off` yourself to override.

Reports a message whose name does not follow the project's naming scheme.

## Why

A message name is a contract between the model and everything that talks to it. The engine
correlates an incoming message by exactly this string, so the developer of the sending service has
to spell it the same way, and an operator reading a failed correlation in Cockpit or Operate has to
recognise which message was meant. A scheme such as `billing.paymentReceived` says which domain
owns the message. Without one the scheme lives in a wiki page nobody checks, and a sender that
writes `PaymentReceived` against a model that says `payment-received` fails only at runtime.

## Why this matters for agentic BPMN

An agent that adds a message event has to invent the message name. With no stated scheme it reuses
the event label or copies whatever shape it saw last, and the model deploys cleanly while the
correlation never matches.

**Typical AI artifact without this rule:** a message named `Payment received`, copied from the
label of its start event.

**What this rule guarantees:** every message name follows one configured prefix, separator and
case, so a tool can generate a name that passes from the same `.bpmnlintrc`.

## Scope

The rule looks at the `name` of every `bpmn:Message` and reports on the message itself.

It leaves these alone:

- A message without a name. Nothing can correlate it, which is the engine's finding, not a naming
  one.
- The label of the event or task that references the message.
- Signal, error and escalation names.

A `bpmn:Message` is a root element without a shape of its own, so a modeler has no place on the
canvas to mark the finding. The CLI and CI output list it by the message's ID.

## Configuration

```json
{
  "rules": {
    "@miragon/rules/message-name-naming": [
      "error",
      { "prefix": "billing", "separator": ".", "case": "camelCase" }
    ]
  }
}
```

With this configuration `billing.paymentReceived` passes, `payment-received` and
`billing.PaymentReceived` are reported.

| Option      | Default     | Effect                                                                                  |
| ----------- | ----------- | --------------------------------------------------------------------------------------- |
| `prefix`    | none        | Text every name starts with, followed by the separator.                                 |
| `separator` | `.`         | Text between the prefix and the name, and between the segments of a namespaced name.    |
| `case`      | `camelCase` | Shape of every segment: `camelCase`, `PascalCase`, `snake_case`, `kebab-case` or `any`. |

The part after the prefix is one or more segments joined by the separator, so the default accepts
both `paymentReceived` and a namespaced `billing.paymentReceived`.

An unknown `case` falls back to `PascalCase`, the same way
[`element-id-naming`](./element-id-naming.md) does.

A tool that creates BPMN can resolve and check the same options through the exported `naming`
helpers:

```ts
import { naming } from '@miragon/bpmnlint-plugin-rules';

const scheme = naming.resolveValueNaming({
  prefix: 'billing',
  separator: '.',
  case: 'camelCase',
});

naming.matchesValueNaming('billing.paymentReceived', scheme); // true
naming.describeValueNaming(scheme); // 'billing.<camelCase>'
```

## Examples

Both models start with the same message start event. Only the name of its message differs.

👎 Invalid: the message name `Order received` is off the default camelCase scheme

![Invalid model: a message name off the naming scheme](./assets/message-name-naming-invalid.svg)

👍 Valid: the same message named `orderReceived`

![Valid model: a message name on the naming scheme](./assets/message-name-naming-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:message id="message_orderReceived" name="Order received" />
```

👍 right:

```xml
<bpmn:message id="message_orderReceived" name="orderReceived" />
```

## Further reading

- [Camunda: Message events](https://docs.camunda.org/manual/latest/reference/bpmn20/events/message-events/): how the engine correlates a message by its name.

## Related

- [`@miragon/rules/external-task-topic-naming`](./external-task-topic-naming.md): the same scheme
  options for external task topics.
- [`@miragon/rules/element-id-naming`](./element-id-naming.md): the convention for element IDs.
