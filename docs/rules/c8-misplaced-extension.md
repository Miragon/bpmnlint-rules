# `@miragon/rules/c8-misplaced-extension`

> This rule is a `warning` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports zeebe extension elements where Camunda 8 does not read them.

## Why

Each zeebe extension element is read on certain element types only: a `zeebe:taskDefinition` on a
job worker task, a `zeebe:userTask` on a user task, a `zeebe:loopCharacteristics` on the
multi-instance loop. Anywhere else Camunda 8 deploys the file and ignores the element. The same holds
for input mappings on start, boundary, none intermediate throw and none end events: Camunda 8 applies
only their output mappings. The variable the mapping was meant to set is missing when the process
runs, and the model gives no hint why.

## Scope

The rule looks at the zeebe extension elements of the elements of an executable process and of the
messages it uses, and reports:

- a zeebe element on an element type that does not read it (`zeebe:taskDefinition` on a Camunda
  user task, `zeebe:calledDecision` on a service task, `zeebe:ioMapping` on a gateway),
- a child element loose in the extension elements instead of in its container (`zeebe:header`
  outside `zeebe:taskHeaders`),
- an input mapping on a start event, a boundary event, a none intermediate throw event or a none end
  event.

Execution listeners on a sequence flow make Camunda 8 refuse the file and are left to
[`c8-listener`](./c8-listener.md). A child element in the wrong container is dropped by the parser
and not reported here.

## Examples

👎 Invalid: an input mapping on the start event

![A start event with an input mapping](./assets/c8-misplaced-extension-invalid.svg)

👍 Valid: an output mapping on the start event

![A start event with an output mapping](./assets/c8-misplaced-extension-valid.svg)

The same, as XML. 👎 wrong:

```xml
<zeebe:ioMapping>
  <zeebe:input source="=orderId" target="orderNumber" />
</zeebe:ioMapping>
```

👍 right:

```xml
<zeebe:ioMapping>
  <zeebe:output source="=orderId" target="orderNumber" />
</zeebe:ioMapping>
```

## Further reading

- [Camunda 8: Variables](https://docs.camunda.io/docs/components/concepts/variables/): input and output mappings and where they apply.

## Related

- [`@miragon/rules/c7-misplaced-extension`](./c7-misplaced-extension.md): the same check for Camunda 7.
- [`@miragon/rules/c8-duplicate-extension`](./c8-duplicate-extension.md): two of an extension element Camunda 8 reads once.
