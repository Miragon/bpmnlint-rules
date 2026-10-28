# `@miragon/rules/c7-error`

> This rule is an `error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports an error end event that throws no error, or whose error has no `errorCode`.

## Why

An error end event hands its `errorCode` to the error boundary events and event sub-processes that
catch it. Camunda 7 refuses to deploy an error end event without `errorRef`, or one whose error has
no (or a blank) `errorCode`, so the whole process stays undeployed. The catching side may leave the
code out: an error boundary event without `errorCode` catches every error.

## Scope

The rule checks the error definition the engine acts on of every end event in an executable process.
Error boundary events and error start events are left alone. Non-executable processes and the
content of ad-hoc sub-processes are skipped.

## Examples

👎 Invalid: the error the end event throws has no errorCode

![An error end event whose error has no errorCode](./assets/c7-error-invalid.svg)

👍 Valid: the error has an errorCode

![An error end event whose error has an errorCode](./assets/c7-error-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:error id="error_paymentFailed" name="paymentFailed" />
```

👍 right:

```xml
<bpmn:error id="error_paymentFailed" name="paymentFailed" errorCode="paymentFailed" />
```

## Further reading

- [Camunda 7: Error events](https://docs.camunda.org/manual/latest/reference/bpmn20/events/error-events/): how errors are thrown and caught by their code.

## Related

- [`@miragon/rules/c7-escalation`](./c7-escalation.md): the same check for escalations.
