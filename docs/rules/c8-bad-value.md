# `@miragon/rules/c8-bad-value`

> This rule is a `warning` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports job retries that are no number and task headers without key or value.

## Why

Camunda 8 deploys a `zeebe:taskDefinition` with `retries="three"`, then fails to evaluate it: every process instance that reaches the task gets an incident ("Expected result of the expression 'three' to be 'NUMBER'") and waits for an operator. A task header without key or without value deploys as well, but Camunda 8 drops it, so the worker never sees the setting it relies on.

## Scope

The rule checks the executable processes of a Camunda 8 diagram. It reports the static `retries` of the job of a service, send, script or business rule task and of a message throw or end event when it is no whole number (an expression starting with `=` is left alone), and every `zeebe:header` without key or value in the task headers of an element or of its execution listeners. A header key used twice is camunda-compat's `duplicate-task-headers`.

## Examples

👎 Invalid: retries that are no number

![A service task whose job has retries="three"](./assets/c8-bad-value-invalid.svg)

👍 Valid: a number of retries

![A service task whose job has retries="3"](./assets/c8-bad-value-valid.svg)

The same, as XML. 👎 wrong:

```xml
<zeebe:taskDefinition type="chargeCard" retries="three" />
<zeebe:taskHeaders>
  <zeebe:header key="channel" />
</zeebe:taskHeaders>
```

👍 right:

```xml
<zeebe:taskDefinition type="chargeCard" retries="3" />
<zeebe:taskHeaders>
  <zeebe:header key="channel" value="mail" />
</zeebe:taskHeaders>
```

## Further reading

- [Camunda 8: Service tasks](https://docs.camunda.io/docs/components/modeler/bpmn/service-tasks/): job type, retries and task headers.
