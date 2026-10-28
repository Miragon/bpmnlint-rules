# `@miragon/rules/c7-multi-instance`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a multi-instance loop Camunda 7 refuses to deploy.

## Why

A multi-instance loop needs to know how many instances to create: a loop cardinality or a
`camunda:collection` (a `loopDataInputRef` works as well, read as a variable name). Camunda 7 refuses
a loop with neither, with an empty cardinality, or with a `camunda:elementVariable` but no
collection. A common cause is a collection written on the activity instead of the loop, which looks
right in the XML and is ignored. camunda-compat does not check it.

## Scope

The rule looks at the multi-instance loop of every activity, including an ad-hoc sub-process
itself, but not at activities inside one. A collection or element variable written on the activity
is named in the message and reported by [`c7-misplaced-attribute`](./c7-misplaced-attribute.md). Only executable processes are checked, and nothing inside an ad-hoc sub-process, which the engines skip with its content.

## Examples

👎 Invalid: a multi-instance loop without cardinality or collection

![A multi-instance loop without cardinality or collection](./assets/c7-multi-instance-invalid.svg)

👍 Valid: the loop iterates a collection

![The loop iterates a collection](./assets/c7-multi-instance-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" name="Charge card">
  <bpmn:multiInstanceLoopCharacteristics />
</bpmn:serviceTask>
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" name="Charge card">
  <bpmn:multiInstanceLoopCharacteristics camunda:collection="${cards}"
      camunda:elementVariable="card" />
</bpmn:serviceTask>
```

## Further reading

- [Camunda 7: Multiple instance](https://docs.camunda.org/manual/latest/reference/bpmn20/tasks/task-markers/#multiple-instance): cardinality, collection and element variable.

## Related

- [`@miragon/rules/c7-ad-hoc-sub-process`](./c7-ad-hoc-sub-process.md): what the engines do with an ad-hoc sub-process.
