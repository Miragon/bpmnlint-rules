# `@miragon/rules/c7-schema`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports an attribute without namespace prefix that the BPMN schema does not define.

## Why

Camunda 7 validates every deployed file against the BPMN XML schema before it reads a single
element. An attribute such as `retries="3"` on a service task, or a vendor attribute written without
its `camunda:` prefix, fails that validation, and the engine refuses the whole deployment. The
modeler shows nothing: the attribute has no property panel, so the file looks correct until the
deployment pipeline breaks.

## Scope

The rule checks the whole file: every process (also non-executable ones and the content of ad-hoc
sub-processes), `bpmn:definitions` and the diagram. It reports each attribute without prefix that
neither BPMN nor the moddle extensions know. An attribute on an event definition, a loop or a
condition is reported on the element that holds it; an attribute on an element without id, on its
nearest ancestor with one.

Attributes with a namespace prefix are left to the other rules. A `camunda:` attribute written
without its prefix on the element type it belongs to (`assignee="demo"` on a user task) is read as
the `camunda:` attribute when the file is parsed, so the rule cannot see it.

## Examples

👎 Invalid: the service task carries an attribute BPMN does not define

![A service task with an unknown attribute](./assets/c7-schema-invalid.svg)

👍 Valid: the service task carries only BPMN and camunda attributes

![A service task with known attributes](./assets/c7-schema-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" camunda:delegateExpression="${chargeCardDelegate}" retries="3" />
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" camunda:delegateExpression="${chargeCardDelegate}" />
```

## Further reading

- [Camunda 7: Extension attributes](https://docs.camunda.org/manual/latest/reference/bpmn20/custom-extensions/extension-attributes/): the attributes Camunda 7 reads, all with the `camunda:` prefix.

## Related

- [`@miragon/rules/c7-unknown-attribute`](./c7-unknown-attribute.md): a `camunda:` attribute the engine does not know.
- [`@miragon/rules/c7-misplaced-attribute`](./c7-misplaced-attribute.md): a `camunda:` attribute on an element that does not read it.
