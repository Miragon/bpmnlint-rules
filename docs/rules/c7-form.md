# `@miragon/rules/c7-form`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a `camunda:formRef` without a known binding, or next to a `camunda:formKey`.

## Why

A Camunda Form is linked with `camunda:formRef` and needs a `camunda:formRefBinding` of
`deployment`, `latest` or `version`. Camunda 7 refuses a file in which the binding is missing or
unknown, or in which the same task also has a `camunda:formKey`, so a form that renders fine in the
modeler stops the deployment. camunda-compat does not check it.

## Scope

The rule looks at user tasks and start events with a `camunda:formRef`. A binding of `version`
without `camunda:formRefVersion` is left to [`c7-binding-version`](./c7-binding-version.md).
Only executable processes are checked, and nothing inside an ad-hoc sub-process, which the engines skip with its content.

## Examples

👎 Invalid: a form reference without a binding

![A form reference without a binding](./assets/c7-form-invalid.svg)

👍 Valid: the form reference binds to the latest version

![The form reference binds to the latest version](./assets/c7-form-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:userTask id="userTask_approveOrder" camunda:formRef="approveOrderForm" />
```

👍 right:

```xml
<bpmn:userTask id="userTask_approveOrder" camunda:formRef="approveOrderForm"
    camunda:formRefBinding="latest" />
```

## Further reading

- [Camunda 7: User task forms](https://docs.camunda.org/manual/latest/user-guide/task-forms/): how a Camunda Form is linked.

## Related

- [`@miragon/rules/c7-binding-version`](./c7-binding-version.md): a version binding without its version.
