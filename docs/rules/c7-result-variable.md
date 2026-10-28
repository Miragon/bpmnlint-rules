# `@miragon/rules/c7-result-variable`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports `camunda:resultVariable` next to `camunda:class` or `camunda:delegateExpression`.

## Why

Camunda 7 stores a return value in `camunda:resultVariable` only for `camunda:expression`. On a task
or message throw event implemented by a class or a delegate expression, the engine refuses the file,
so a variable meant for the next step stops the deployment instead. camunda-compat does not check it.

## Scope

The rule looks at service, send and business rule tasks and at the message definition of message
throw and end events. A result variable with `camunda:expression`, on a business rule task with a
decision, or on a script task is left alone. Only executable processes are checked, and nothing inside an ad-hoc sub-process, which the engines skip with its content.

## Examples

👎 Invalid: a delegate expression with a result variable

![A delegate expression with a result variable](./assets/c7-result-variable-invalid.svg)

👍 Valid: an expression with a result variable

![An expression with a result variable](./assets/c7-result-variable-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard"
    camunda:delegateExpression="${chargeCardDelegate}"
    camunda:resultVariable="chargeResult" />
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard"
    camunda:expression="${chargeCardService.charge(execution)}"
    camunda:resultVariable="chargeResult" />
```

## Further reading

- [Camunda 7: Service task](https://docs.camunda.org/manual/latest/reference/bpmn20/tasks/service-task/): where a result variable is supported.

## Related

- [`@miragon/rules/c7-implementation`](./c7-implementation.md): tasks without an implementation.
