# `@miragon/rules/c7-bad-value`

> This rule is `a warning` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a value Camunda 7 deploys but cannot use when the process runs.

## Why

Some values pass the deployment and fail later: an external task with an empty `camunda:topic` is
never fetched by any worker, a call activity with an empty `calledElement` fails when it is reached,
a binding outside `latest`, `deployment`, `version` and `versionTag` does not resolve the called
process or decision as intended, a user task `camunda:priority` that is not a number or expression
makes creating the task fail, and a `camunda:variableEvents` entry other than `create`, `update` or
`delete` never triggers its condition. The process starts and then stops or waits forever at that
step.

## Scope

The rule reads `camunda:topic` of external tasks and external message throw events, `calledElement`
of call activities without `camunda:caseRef`, `camunda:calledElementBinding`, `camunda:caseBinding`
and `camunda:decisionRefBinding` (with a `camunda:decisionRef`), `camunda:priority` of user tasks and
`camunda:variableEvents` of the conditional definitions the engines act on. A binding of `version`
or `versionTag` without its version is left to [`c7-binding-version`](./c7-binding-version.md).
Boolean attributes are not checked: the parser has already turned them into `true` or `false`.
Only executable processes are checked, and nothing inside an ad-hoc sub-process, which the engines skip with its content.

## Examples

👎 Invalid: a user task priority of `high`

![A user task priority of `high`](./assets/c7-bad-value-invalid.svg)

👍 Valid: a user task priority of 50

![A user task priority of 50](./assets/c7-bad-value-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:userTask id="userTask_approveOrder" camunda:priority="high" />
```

👍 right:

```xml
<bpmn:userTask id="userTask_approveOrder" camunda:priority="50" />
```

## Further reading

- [Camunda 7: User task](https://docs.camunda.org/manual/latest/reference/bpmn20/tasks/user-task/): the priority of a user task.
- [Camunda 7: External tasks](https://docs.camunda.org/manual/latest/user-guide/process-engine/external-tasks/): how workers fetch and lock tasks by topic.

## Related

- [`@miragon/rules/c7-attribute-value`](./c7-attribute-value.md): values the engines refuse at deploy.
