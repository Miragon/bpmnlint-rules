# `@miragon/rules/external-task-topic-naming`

> This rule is **off** in `plugin:@miragon/rules/recommended-for-modeling` (id conventions matter once a process is executable, not while modeling). It is a non-blocking `warn` in `plugin:@miragon/rules/recommended-for-automation` and an `error` in `plugin:@miragon/rules/all`. Set it to `warn`, `error` or `off` yourself to override.

Reports an external task whose topic does not follow the project's naming scheme.

## Why

A topic is a contract between the model and the code. The worker subscribes to exactly this string,
so a developer writing the worker has to find it, an operator reading Cockpit has to recognise it,
and nothing fails at deploy time when two teams spell it differently. A scheme such as
`billing.validateInvoice` says which domain owns the work and what the work does. Without one the
scheme lives in a wiki page nobody checks, and a topic like `validate-invoice` next to
`ValidateInvoice` leaves the developer guessing which worker picks it up.

## Why this matters for agentic BPMN

An agent that adds an external task has to invent a topic. With no stated scheme it copies whatever
shape it saw last, and the result deploys cleanly while no worker ever fetches the job.

**Typical AI artifact without this rule:** `billing.validateInvoice`, `validate-invoice` and
`ValidateInvoiceTopic` in one model, each from a different edit.

**What this rule guarantees:** every external task topic follows one configured prefix, separator
and case, so a tool can generate a topic that passes from the same `.bpmnlintrc`.

## Scope

The rule looks at an external task implementation: `camunda:type="external"` or
`operaton:type="external"`, with the topic read from `camunda:topic` or `operaton:topic`. That
covers:

- a service task, a business rule task and a send task, reported on the task
- a message event definition of a throw or end event, reported on the event

It leaves these alone:

- An external task without a topic. That is a deploy error the engine layer reports, not a naming
  finding.
- A task that is not external, even if it carries a `camunda:topic` attribute.
- A Camunda 8 job type (`zeebe:taskDefinition`).

## Configuration

```json
{
  "rules": {
    "@miragon/rules/external-task-topic-naming": [
      "error",
      { "prefix": "billing", "separator": ".", "case": "camelCase" }
    ]
  }
}
```

With this configuration `billing.validateInvoice` passes, `validate-invoice` and
`billing.ValidateInvoice` are reported.

| Option      | Default     | Effect                                                                                  |
| ----------- | ----------- | --------------------------------------------------------------------------------------- |
| `prefix`    | none        | Text every topic starts with, followed by the separator.                                |
| `separator` | `.`         | Text between the prefix and the name, and between the segments of a namespaced name.    |
| `case`      | `camelCase` | Shape of every segment: `camelCase`, `PascalCase`, `snake_case`, `kebab-case` or `any`. |

The part after the prefix is one or more segments joined by the separator, so the default accepts
both `validateInvoice` and a namespaced `billing.validateInvoice`.

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

naming.matchesValueNaming('billing.validateInvoice', scheme); // true
naming.describeValueNaming(scheme); // 'billing.<camelCase>'
```

## Examples

Both models show the same external service task. Only its topic differs.

👎 Invalid: the topic `review-order` is off the default camelCase scheme

![Invalid model: an external task topic off the naming scheme](./assets/external-task-topic-naming-invalid.svg)

👍 Valid: the same task with the topic `reviewOrder`

![Valid model: an external task topic on the naming scheme](./assets/external-task-topic-naming-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_reviewOrder" name="Review order" camunda:type="external" camunda:topic="review-order" />
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_reviewOrder" name="Review order" camunda:type="external" camunda:topic="reviewOrder" />
```

## Further reading

- [Camunda: External tasks](https://docs.camunda.org/manual/latest/user-guide/process-engine/external-tasks/): how a worker fetches and locks jobs by topic name.

## Related

- [`@miragon/rules/message-name-naming`](./message-name-naming.md): the same scheme options for
  message names.
- [`@miragon/rules/element-id-naming`](./element-id-naming.md): the convention for element IDs.
