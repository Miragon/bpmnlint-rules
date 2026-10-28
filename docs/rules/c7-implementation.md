# `@miragon/rules/c7-implementation`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a task or message throw event whose implementation Camunda 7 refuses to deploy.

## Why

A service, send or business rule task needs an implementation: `camunda:class`,
`camunda:delegateExpression`, `camunda:expression`, `camunda:type="external"`, a connector or, on a
business rule task, `camunda:decisionRef`. Without one, Camunda 7 refuses the whole file, so one
unfinished task blocks every process in the deployment. The same happens for a `camunda:type` other
than `external` or `shell` (the mail task does not load in the standard distributions) and for a
shell task that has no `command` field, passes an expression to a field, or sets a flag such as
`wait` to something other than `true` or `false`. camunda-compat has no Camunda 7 rule for this.

## Scope

The rule looks at service, send and business rule tasks, and at the message definition of message
intermediate throw and end events. A throw event without any implementation deploys, so it is left
to [`c7-message-implementation`](./c7-message-implementation.md). A shell field without a value is
left to [`c7-extension`](./c7-extension.md). An empty `camunda:expression` counts as none. Only executable processes are checked, and nothing inside an ad-hoc sub-process, which the engines skip with its content.

## Examples

👎 Invalid: a service task without an implementation

![A service task without an implementation](./assets/c7-implementation-invalid.svg)

👍 Valid: the service task calls a delegate

![The service task calls a delegate](./assets/c7-implementation-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" name="Charge card" />
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" name="Charge card"
    camunda:delegateExpression="${chargeCardDelegate}" />
```

## Further reading

- [Camunda 7: Service task](https://docs.camunda.org/manual/latest/reference/bpmn20/tasks/service-task/): the ways a service task can be implemented.

## Related

- [`@miragon/rules/c7-external-topic`](./c7-external-topic.md): an external task needs a topic.
- [`@miragon/rules/c7-message-implementation`](./c7-message-implementation.md): a message throw event without an implementation.
