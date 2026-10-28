# `@miragon/rules/c8-feel-completion-condition`

> This rule is a `warning` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports a multi-instance completion condition that is no FEEL expression.

## Why

Camunda 8 deploys a multi-instance activity whose completion condition does not start with `=`, but it reads the condition as a string. When the first instance completes, the engine expects a boolean, gets the string and raises an incident ("Expected result of the expression '${done}' to be 'BOOLEAN', but was 'STRING'"). Every process instance then stops at that activity until an operator resolves the incident. A JUEL condition from a Camunda 7 model is the usual cause.

## Scope

The rule looks at every activity with a `bpmn:multiInstanceLoopCharacteristics` in the executable processes of a Camunda 8 diagram and reports it when its `completionCondition` does not start with `=`. A FEEL completion condition with a syntax slip is `c8-feel-expression`.

## Examples

👎 Invalid: a JUEL completion condition

![A multi-instance service task with a JUEL completion condition](./assets/c8-feel-completion-condition-invalid.svg)

👍 Valid: the completion condition in FEEL

![A multi-instance service task with a FEEL completion condition](./assets/c8-feel-completion-condition-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:completionCondition xsi:type="bpmn:tFormalExpression">${charged}</bpmn:completionCondition>
```

👍 right:

```xml
<bpmn:completionCondition xsi:type="bpmn:tFormalExpression">=charged</bpmn:completionCondition>
```

## Further reading

- [Camunda 8: Multi-instance](https://docs.camunda.io/docs/components/modeler/bpmn/multi-instance/): the completion condition of a multi-instance activity.

## Related

- [`@miragon/rules/c8-feel-expression`](./c8-feel-expression.md): FEEL values Camunda 8 refuses at deploy.
