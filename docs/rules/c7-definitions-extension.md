# `@miragon/rules/c7-definitions-extension`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports `bpmn:extensionElements` directly under `bpmn:definitions`.

## Why

The BPMN schema does not allow extension elements on `bpmn:definitions`. Camunda 7 validates the
file against the schema and refuses to deploy it, so properties a tool stored there (an owner, a
version note) stop the whole deployment. Nothing in the modeler shows them.

## Scope

The rule looks at `bpmn:definitions` of a Camunda 7 diagram and reports it when its extension
elements hold any content. Empty extension elements and extension elements on processes and flow
elements are left alone.

## Examples

👎 Invalid: `camunda:properties` directly under `bpmn:definitions`

![The process with properties on the definitions](./assets/c7-definitions-extension-invalid.svg)

👍 Valid: no extension elements on `bpmn:definitions`

![The process without properties on the definitions](./assets/c7-definitions-extension-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:definitions id="Definitions_SavePoints">
  <bpmn:extensionElements>
    <camunda:properties>
      <camunda:property name="owner" value="payments" />
    </camunda:properties>
  </bpmn:extensionElements>
  <bpmn:process id="orderPayment" isExecutable="true" />
</bpmn:definitions>
```

👍 right (the properties move to the process):

```xml
<bpmn:process id="orderPayment" isExecutable="true">
  <bpmn:extensionElements>
    <camunda:properties>
      <camunda:property name="owner" value="payments" />
    </camunda:properties>
  </bpmn:extensionElements>
</bpmn:process>
```

## Further reading

- [Camunda 7: Extension elements](https://docs.camunda.org/manual/latest/reference/bpmn20/custom-extensions/extension-elements/): where each `camunda:` element may appear.

## Related

- [`@miragon/rules/c7-schema`](./c7-schema.md): attributes the BPMN schema does not define.
- [`@miragon/rules/c7-misplaced-extension`](./c7-misplaced-extension.md): extension elements on elements that do not read them.
