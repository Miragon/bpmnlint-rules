# `@miragon/rules/c7-binding-version`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a binding of `version` or `versionTag` without the version or tag it binds to.

## Why

A call activity, business rule task or form reference with a binding of `version` must say which
version, and one with `versionTag` which tag. Without it Camunda 7 refuses the file, so the
deployment fails on a reference that only lacks one attribute. camunda-compat does not check it.

## Scope

The rule reads `camunda:calledElementBinding` and `camunda:caseBinding` of call activities,
`camunda:decisionRefBinding` of business rule tasks with a `camunda:decisionRef` and
`camunda:formRefBinding` of user tasks and start events with a `camunda:formRef`. A binding value the
engines do not know is left to [`c7-bad-value`](./c7-bad-value.md) and
[`c7-form`](./c7-form.md). Only executable processes are checked, and nothing inside an ad-hoc sub-process, which the engines skip with its content.

## Examples

👎 Invalid: a form bound to a version without `camunda:formRefVersion`

![A form bound to a version without `camunda:formRefVersion`](./assets/c7-binding-version-invalid.svg)

👍 Valid: the form binding names its version

![The form binding names its version](./assets/c7-binding-version-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:userTask id="userTask_approveOrder" camunda:formRef="approveOrderForm"
    camunda:formRefBinding="version" />
```

👍 right:

```xml
<bpmn:userTask id="userTask_approveOrder" camunda:formRef="approveOrderForm"
    camunda:formRefBinding="version" camunda:formRefVersion="1" />
```

## Further reading

- [Camunda 7: Call activity](https://docs.camunda.org/manual/latest/reference/bpmn20/subprocesses/call-activity/): how bindings pick the called version.

## Related

- [`@miragon/rules/c7-called-element`](./c7-called-element.md): a call activity that calls nothing.
- [`@miragon/rules/c7-form`](./c7-form.md): a form reference without a known binding.
