# `@miragon/rules/c8-misplaced-attribute`

> This rule is a `warning` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports a zeebe attribute on a BPMN element that does not carry it.

## Why

A few zeebe settings are attributes of BPMN elements: the template of an element
(`zeebe:modelerTemplate`) or the retry counter variable of a job worker task
(`zeebe:retryCounter`). On an element type that does not carry them, Camunda 8 ignores them. A
retry counter on a start event, or a template on a lane, looks configured and has no effect.

## Scope

The rule looks at the `zeebe:` attributes of the elements of an executable process and of the
messages it uses, and reports one the zeebe descriptor defines for other element types. The message
lists the types that carry it. An attribute the descriptor does not define at all is left to
[`c8-unknown-attribute`](./c8-unknown-attribute.md).

## Examples

👎 Invalid: a retry counter on the start event

![A start event with zeebe:retryCounter](./assets/c8-misplaced-attribute-invalid.svg)

👍 Valid: the retry counter on the service task

![A service task with zeebe:retryCounter](./assets/c8-misplaced-attribute-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:startEvent id="startEvent_orderReceived" zeebe:retryCounter="3" />
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" zeebe:retryCounter="3" />
```

## Further reading

- [Camunda 8: Service tasks](https://docs.camunda.io/docs/components/modeler/bpmn/service-tasks/): the settings of a job worker task.

## Related

- [`@miragon/rules/c7-misplaced-attribute`](./c7-misplaced-attribute.md): the same check for Camunda 7.
- [`@miragon/rules/c8-misplaced-extension`](./c8-misplaced-extension.md): a zeebe extension element where Camunda 8 does not read it.
