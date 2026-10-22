# `@miragon/rules/worker-topic-naming`

> This rule is **off** in both `plugin:@miragon/rules/recommended-for-modeling` and `plugin:@miragon/rules/recommended-for-automation` (the scheme is a project decision, so you configure it before you switch the rule on). It is an `error` in `plugin:@miragon/rules/all`, with the default scheme. Set it to `warn`, `error` or `off` yourself to override.

Reports a worker topic that does not follow the project's naming scheme: the topic of a Camunda 7 or
Operaton external task, or the job type of a Camunda 8 task.

## Why

A worker topic is a contract between the model and the code. The worker subscribes to exactly this
string, so a developer writing the worker has to find it, an operator reading Cockpit or Operate has
to recognise it, and nothing fails at deploy time when two teams spell it differently. A scheme such
as `billing.validateInvoice` says which service owns the work and what the work does. Without one the
scheme lives in a wiki page nobody checks, and a topic like `validate-invoice` next to
`ValidateInvoice` leaves the developer guessing which worker picks it up.

Camunda 7 calls this string a topic, Camunda 8 a job type. It is the same contract, so one rule with
one scheme covers both, and a team that moves from Camunda 7 to 8 keeps its configuration.

## Why this matters for agentic BPMN

An agent that adds a service task has to invent a topic. With no stated scheme it copies whatever
shape it saw last, and the result deploys cleanly while no worker ever fetches the job.

**Typical AI artifact without this rule:** `billing.validateInvoice`, `validate-invoice` and
`ValidateInvoiceTopic` in one model, each from a different edit.

**What this rule guarantees:** every worker topic follows one configured scheme, so a tool can
generate a topic that passes from the same `.bpmnlintrc`.

## Scope

The rule reads the topic where the engine keeps it:

- Camunda 7 and Operaton: `camunda:topic` or `operaton:topic` on an external task
  (`camunda:type="external"` or `operaton:type="external"`). That covers a service, business rule
  or send task, reported on the task, and the message event definition of a throw or end event,
  reported on the event.
- Camunda 8: the `type` of `<zeebe:taskDefinition>` in an element's extension elements, reported on
  that element.

It leaves these alone:

- A missing topic or job type. That is a deploy error the engine layer reports, not a naming
  finding.
- An expression (`=…` in FEEL, `${…}` or `#{…}` in JUEL). The engine resolves it at runtime, so
  there is no fixed value to check.
- A task that is not external, even if it carries a `camunda:topic` attribute.

The rule reads only `camunda:`, `operaton:` and `zeebe:` attributes, so a diagram without workers
never produces a finding.

## Configuration

Every option is optional. Without any, the rule checks the default scheme: camelCase segments joined
by a dot.

| Option      | Default     | Effect                                                                                  |
| ----------- | ----------- | --------------------------------------------------------------------------------------- |
| `prefix`    | none        | Fixed text every topic starts with, followed by the separator.                          |
| `separator` | `.`         | Joins the prefix and every segment.                                                     |
| `case`      | `camelCase` | Shape of every segment: `camelCase`, `PascalCase`, `snake_case`, `kebab-case` or `any`. |
| `segments`  | one or more | Exact number of segments after the prefix. Any value but a positive integer is ignored. |

An unknown `case` falls back to `PascalCase`, the same way
[`element-id-naming`](./element-id-naming.md) does. A dot inside the prefix does not count as a
segment: `{ "prefix": "com.acme.billing", "segments": 1 }` accepts `com.acme.billing.validateInvoice`.

| Configuration                                                     | Passes                                                | Reported                                             |
| ----------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| none                                                              | `validateInvoice`, `billing.validateInvoice`          | `validate-invoice`                                   |
| `{ "prefix": "billing" }`                                         | `billing.validateInvoice`                             | `validateInvoice`, `billing.ValidateInvoice`         |
| `{ "segments": 2 }`                                               | `billing.validateInvoice`, `shipping.validateInvoice` | `validateInvoice`, `billing.invoice.validateInvoice` |
| `{ "prefix": "billing", "separator": "/", "case": "kebab-case" }` | `billing/validate-invoice`                            | `billing/validateInvoice`                            |

### Several services

One `.bpmnlintrc` often covers several services, each with its own lead (`billing.…`,
`shipping.…`). Two ways to check that:

- `{ "segments": 2 }` in the shared `.bpmnlintrc` fixes the shape `<service>.<name>` for every
  service. It does not know the service names, so a typo such as `biling.validateInvoice` passes.
- One `.bpmnlintrc` per service, each with its own `prefix`, checks the service name exactly. Run
  bpmnlint once per service, for example
  `npx bpmnlint --config services/billing/.bpmnlintrc "services/billing/**/*.bpmn"`.

A tool that creates BPMN reads the same options through the exported `naming` helpers. It builds
the topic from the prefix and a name it was given, never a guessed service, and checks the result:

```ts
import { naming } from '@miragon/bpmnlint-plugin-rules';

const scheme = naming.resolveValueNaming({ segments: 2 });

naming.matchesValueNaming('billing.validateInvoice', scheme); // true
naming.describeValueNaming(scheme); // '<camelCase>.<camelCase>'
```

## Examples

Both models show the same external service task. Only its topic differs.

👎 Invalid: the topic `review-order` is off the default camelCase scheme

![Invalid model: a worker topic off the naming scheme](./assets/worker-topic-naming-invalid.svg)

👍 Valid: the same task with the topic `reviewOrder`

![Valid model: a worker topic on the naming scheme](./assets/worker-topic-naming-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_reviewOrder" camunda:type="external" camunda:topic="review-order" />
<bpmn:serviceTask id="serviceTask_reviewOrder">
  <bpmn:extensionElements>
    <zeebe:taskDefinition type="review-order" />
  </bpmn:extensionElements>
</bpmn:serviceTask>
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_reviewOrder" camunda:type="external" camunda:topic="reviewOrder" />
<bpmn:serviceTask id="serviceTask_reviewOrder">
  <bpmn:extensionElements>
    <zeebe:taskDefinition type="reviewOrder" />
  </bpmn:extensionElements>
</bpmn:serviceTask>
```

## Further reading

- [Camunda 7: External tasks](https://docs.camunda.org/manual/latest/user-guide/process-engine/external-tasks/): how a worker fetches and locks work by topic name.
- [Camunda 8: Job workers](https://docs.camunda.io/docs/components/concepts/job-workers/): how a worker subscribes to a job type.

## Related

- [`@miragon/rules/message-name-naming`](./message-name-naming.md): the same scheme options for
  message names.
- [`@miragon/rules/element-id-naming`](./element-id-naming.md): the convention for element IDs.
