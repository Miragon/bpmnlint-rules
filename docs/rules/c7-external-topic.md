# `@miragon/rules/c7-external-topic`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports an external task without `camunda:topic`.

## Why

An external task is fetched by workers through its topic. Camunda 7 refuses to deploy a task with
`camunda:type="external"` and no `camunda:topic`, so the deployment fails although every worker is
ready. camunda-compat does not check it.

## Scope

The rule looks at service, send and business rule tasks and at the message definition of message
throw and end events whose `camunda:type` is `external` (in any case). An empty topic deploys and is
left to [`c7-bad-value`](./c7-bad-value.md). Only executable processes are checked, and nothing inside an ad-hoc sub-process, which the engines skip with its content.

## Examples

👎 Invalid: an external task without a topic

![An external task without a topic](./assets/c7-external-topic-invalid.svg)

👍 Valid: the external task has a topic

![The external task has a topic](./assets/c7-external-topic-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" camunda:type="external" />
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" camunda:type="external" camunda:topic="chargeCard" />
```

## Further reading

- [Camunda 7: External tasks](https://docs.camunda.org/manual/latest/user-guide/process-engine/external-tasks/): how workers fetch and lock tasks by topic.

## Related

- [`@miragon/rules/c7-implementation`](./c7-implementation.md): tasks without an implementation.
- [`@miragon/rules/c7-bad-value`](./c7-bad-value.md): an empty topic.
