# `@miragon/rules/c7-duplicate-extension`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a second `camunda:inputOutput`, `camunda:connector`, `camunda:formData` or `camunda:failedJobRetryTimeCycle` where Camunda 7 reads one.

## Why

The Camunda 7 engines look these extension elements up as a single element. When an element
carries two of them, they refuse the file (ENGINE-01009, multiple elements with tag name), so a copy
and paste in the XML or a merge of two branches blocks the deployment.

## Scope

The rule reports, on the second of them, two or more `camunda:inputOutput` on a flow node,
`camunda:connector` on a service, send or business rule task, `camunda:formData` on a user task or
start event, and `camunda:failedJobRetryTimeCycle` on an asynchronous element or a timer event. Two
retry cycles on an element that is not asynchronous are
[`c7-async-duplicate-extension`](./c7-async-duplicate-extension.md)'s. Two `camunda:properties`
deploy and are left alone. The rule checks the elements of executable processes; non-executable processes and the content of ad-hoc sub-processes are skipped, as the engines skip them. A finding on an event definition or loop is reported on its flow node.

## Examples

👎 Invalid: two retry cycles on an asynchronous service task

![A service task with two retry cycles](./assets/c7-duplicate-extension-invalid.svg)

👍 Valid: one retry cycle

![A service task with one retry cycle](./assets/c7-duplicate-extension-valid.svg)

The same, as XML. 👎 wrong:

```xml
<camunda:failedJobRetryTimeCycle>R3/PT5M</camunda:failedJobRetryTimeCycle>
<camunda:failedJobRetryTimeCycle>R5/PT10M</camunda:failedJobRetryTimeCycle>
```

👍 right:

```xml
<camunda:failedJobRetryTimeCycle>R3/PT5M</camunda:failedJobRetryTimeCycle>
```

## Further reading

- [Camunda 7: Extension elements](https://docs.camunda.org/manual/latest/reference/bpmn20/custom-extensions/extension-elements/): every camunda extension element and where the engine reads it.

## Related

- [`@miragon/rules/c7-async-duplicate-extension`](./c7-async-duplicate-extension.md): two retry cycles on an element that is not asynchronous yet.
- [`@miragon/rules/c8-duplicate-extension`](./c8-duplicate-extension.md): the duplicate check for Camunda 8.
