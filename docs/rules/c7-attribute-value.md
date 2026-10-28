# `@miragon/rules/c7-attribute-value`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a priority that is neither a number nor an expression, and an unknown `camunda:mapDecisionResult`.

## Why

Camunda 7 parses `camunda:jobPriority` and `camunda:taskPriority` when the file is deployed: a
whole number or an expression such as `${priority}` works, a word like `high` or a decimal makes the
engine refuse the file. The same holds for `camunda:mapDecisionResult` on a business rule task, which
must be one of `singleEntry`, `singleResult`, `collectEntries` or `resultList`. camunda-compat does
not check these values.

## Scope

The rule reads `camunda:jobPriority` and `camunda:taskPriority` on executable processes,
`camunda:jobPriority` on activities, gateways, events and multi-instance loops, `camunda:taskPriority`
on external tasks and external message throw events, and `camunda:mapDecisionResult` on business rule
tasks with a `camunda:decisionRef`. A priority on an element the engines do not read it on is left
alone. Only executable processes are checked, and nothing inside an ad-hoc sub-process, which the engines skip with its content.

## Examples

👎 Invalid: a job priority of `high`

![A job priority of `high`](./assets/c7-attribute-value-invalid.svg)

👍 Valid: a job priority of 10

![A job priority of 10](./assets/c7-attribute-value-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" camunda:asyncBefore="true"
    camunda:jobPriority="high" />
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" camunda:asyncBefore="true"
    camunda:jobPriority="10" />
```

## Further reading

- [Camunda 7: Job prioritization](https://docs.camunda.org/manual/latest/user-guide/process-engine/the-job-executor/#job-prioritization): where priorities are read and what they accept.

## Related

- [`@miragon/rules/c7-bad-value`](./c7-bad-value.md): values that deploy but fail at run time.
