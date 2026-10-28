# `@miragon/rules/c7-extension`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports camunda extension content Camunda 7 refuses to deploy.

## Why

The Camunda 7 engines parse the content of camunda extension elements when the file is deployed,
and refuse the whole file when one of them is incomplete: a `camunda:in` or `camunda:out` without
source and target, an input or output parameter without name, a connector without
`camunda:connectorId`, a form field without id or with a type no engine knows, and a
`camunda:field` without value where the implementation reads its fields. The process then stays
undeployed, and the deployment error names the element, not the attribute that is missing.

## Scope

The rule checks the camunda extension elements the engines read where they sit:

- `camunda:in` and `camunda:out` without `source` (or `sourceExpression`) and `target`, unless they
  map `variables` (or, for `camunda:in`, a `businessKey`).
- `camunda:inputParameter` and `camunda:outputParameter` without `name`, also inside a connector.
- `camunda:connector` without `camunda:connectorId`.
- `camunda:formField` without `id`, without `type`, or with a type other than string, long, boolean,
  date and enum.
- `camunda:field` without stringValue, expression, `camunda:string` or `camunda:expression` (or
  with both `stringValue` and `camunda:string`), on a class or delegate expression implementation
  or listener, a shell task, or the message definition a throw event acts on. Fields of an
  expression or external implementation are not read and are left alone.

The rule checks the elements of executable processes; non-executable processes and the content of ad-hoc sub-processes are skipped, as the engines skip them. A finding on an event definition or loop is reported on its flow node. Extension elements on a host that does not read them are
[`c7-misplaced-extension`](./c7-misplaced-extension.md)'s.

## Examples

👎 Invalid: a form field without type

![A user task whose form field has no type](./assets/c7-extension-invalid.svg)

👍 Valid: the form field has a type

![A user task whose form field has a type](./assets/c7-extension-valid.svg)

The same, as XML. 👎 wrong:

```xml
<camunda:formField id="approved" label="Approved" />
```

👍 right:

```xml
<camunda:formField id="approved" label="Approved" type="boolean" />
```

## Further reading

- [Camunda 7: Extension elements](https://docs.camunda.org/manual/latest/reference/bpmn20/custom-extensions/extension-elements/): every camunda extension element and where the engine reads it.

## Related

- [`@miragon/rules/c7-listener`](./c7-listener.md): listeners the engines refuse.
- [`@miragon/rules/c7-misplaced-extension`](./c7-misplaced-extension.md): extension elements the engines do not read where they sit.
