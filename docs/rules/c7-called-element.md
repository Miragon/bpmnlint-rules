# `@miragon/rules/c7-called-element`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a call activity that calls nothing, or both a process and a case.

## Why

A call activity in Camunda 7 calls a process through `calledElement` or a case through
`camunda:caseRef`. With neither, or with both, the engine refuses the file, so the deployment fails
before any instance can reach the step. camunda-compat does not check it.

## Scope

The rule looks at every call activity. An empty `calledElement` deploys and is left to
[`c7-bad-value`](./c7-bad-value.md). Only executable processes are checked, and nothing inside an ad-hoc sub-process, which the engines skip with its content.

## Examples

👎 Invalid: a call activity without `calledElement`

![A call activity without `calledElement`](./assets/c7-called-element-invalid.svg)

👍 Valid: the call activity calls a process

![The call activity calls a process](./assets/c7-called-element-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:callActivity id="callActivity_chargeCard" name="Charge card" />
```

👍 right:

```xml
<bpmn:callActivity id="callActivity_chargeCard" name="Charge card" calledElement="cardPayment" />
```

## Further reading

- [Camunda 7: Call activity](https://docs.camunda.org/manual/latest/reference/bpmn20/subprocesses/call-activity/): what a call activity may call.

## Related

- [`@miragon/rules/c7-binding-version`](./c7-binding-version.md): a binding without its version.
