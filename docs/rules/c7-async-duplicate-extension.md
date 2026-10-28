# `@miragon/rules/c7-async-duplicate-extension`

> This rule is `an info` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a second `camunda:failedJobRetryTimeCycle` on an element that does not run asynchronously yet.

## Why

The Camunda 7 engines read the retry cycle only on an asynchronous element or a timer event. On
any other element two retry cycles deploy, as the engines ignore them. The moment someone marks the
element `asyncBefore` or `asyncAfter`, the engines read the cycle and refuse the file
(ENGINE-01009), although nobody touched the retry cycles.

## Scope

The rule reports, on the second of them, two or more `camunda:failedJobRetryTimeCycle` on an element
that is neither asynchronous nor a timer event. On an asynchronous element or a timer event they
are [`c7-duplicate-extension`](./c7-duplicate-extension.md)'s. The rule checks the elements of executable processes; non-executable processes and the content of ad-hoc sub-processes are skipped, as the engines skip them. A finding on an event definition or loop is reported on its flow node.

## Examples

👎 Invalid: two retry cycles on the end event

![An end event with two retry cycles](./assets/c7-async-duplicate-extension-invalid.svg)

👍 Valid: one retry cycle

![An end event with one retry cycle](./assets/c7-async-duplicate-extension-valid.svg)

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

- [Camunda 7: Failed jobs](https://docs.camunda.org/manual/latest/user-guide/process-engine/the-job-executor/#failed-jobs): how the retry time cycle is read.

## Related

- [`@miragon/rules/c7-duplicate-extension`](./c7-duplicate-extension.md): duplicates the engines refuse now.
