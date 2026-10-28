# `@miragon/rules/c8-foreign-content`

> This rule is a `warning` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports Camunda 7 attributes and extension elements in a Camunda 8 diagram.

## Why

Camunda 8 reads its settings from the zeebe namespace only. A `camunda:assignee`, a
`camunda:asyncBefore` or a `camunda:inputOutput` left over from a migrated Camunda 7 model deploys
without complaint and then does nothing: the user task is not assigned, the mapping does not happen.
The diagram still shows the setting in the XML, so a reviewer believes it works. The same holds for
`operaton:` content.

## Scope

The rule reports every `camunda:` and `operaton:` attribute and extension element on the elements
of an executable process and on the messages it uses. Where Camunda 8 has a counterpart (an
assignee, a job type, a mapping), the message names the zeebe element that carries it.

## Examples

👎 Invalid: a Camunda 7 attribute on a service task

![A service task with camunda:asyncBefore](./assets/c8-foreign-content-invalid.svg)

👍 Valid: zeebe content only

![A service task with zeebe content only](./assets/c8-foreign-content-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" camunda:asyncBefore="true">
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard">
```

## Further reading

- [Camunda 8: Migrating from Camunda 7](https://docs.camunda.io/docs/guides/migrating-from-camunda-7/): how Camunda 7 settings map to Camunda 8.

## Related

- [`@miragon/rules/c7-foreign-content`](./c7-foreign-content.md): zeebe content in a Camunda 7 diagram.
- [`@miragon/rules/c8-unknown-attribute`](./c8-unknown-attribute.md): zeebe attributes Camunda 8 does not know.
