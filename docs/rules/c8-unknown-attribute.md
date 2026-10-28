# `@miragon/rules/c8-unknown-attribute`

> This rule is a `warning` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports attributes Camunda 8 does not know, on BPMN elements and on zeebe extension elements.

## Why

Most zeebe settings are extension elements, not attributes. A hand-written `zeebe:assignee` on a
user task, or a typo such as `retrys` on `zeebe:taskDefinition`, deploys and is then ignored: the
task is not assigned, the job keeps its default retries. Nothing in the running process points back
to the attribute, so the cause is hard to find.

## Scope

The rule looks at the elements of an executable process and at the messages it uses, and reports:

- a `zeebe:` attribute of a BPMN element the zeebe descriptor does not define; when a zeebe
  extension element of that element has an attribute of that name, the message names it,
- an attribute a zeebe extension element does not have, at any depth (a `zeebe:input` inside
  `zeebe:ioMapping`, a header of a listener).

A known zeebe attribute on the wrong BPMN element is left to
[`c8-misplaced-attribute`](./c8-misplaced-attribute.md). An unknown zeebe element is dropped by the
parser and not reported here.

## Examples

👎 Invalid: a typo in an attribute of the task definition

![A service task whose task definition has the attribute retrys](./assets/c8-unknown-attribute-invalid.svg)

👍 Valid: the attribute is spelled as Camunda 8 reads it

![A service task whose task definition has the attribute retries](./assets/c8-unknown-attribute-valid.svg)

The same, as XML. 👎 wrong:

```xml
<zeebe:taskDefinition type="chargeCard" retrys="3" />
```

👍 right:

```xml
<zeebe:taskDefinition type="chargeCard" retries="3" />
```

## Further reading

- [Camunda 8: Service tasks](https://docs.camunda.io/docs/components/modeler/bpmn/service-tasks/): the attributes of a task definition.

## Related

- [`@miragon/rules/c7-unknown-attribute`](./c7-unknown-attribute.md): the same check for Camunda 7.
- [`@miragon/rules/c8-misplaced-attribute`](./c8-misplaced-attribute.md): a known zeebe attribute on the wrong element.
