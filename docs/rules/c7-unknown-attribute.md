# `@miragon/rules/c7-unknown-attribute`

> This rule is `a warning` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a camunda attribute Camunda 7 does not know, such as the typo `camunda:asignee`.

## Why

The Camunda 7 engines ignore attributes they do not know. A typo in `camunda:assignee` deploys and
leaves the task unassigned; a typo in `camunda:asyncBefore` leaves out the transaction boundary.
Nothing fails, the process only behaves differently than modeled. The message names the closest
known attribute.

## Scope

The rule reports camunda attributes the camunda descriptor does not define, on BPMN elements, and
attributes without prefix the camunda extension elements the engines read do not define. Known
attributes on the wrong element are [`c7-misplaced-attribute`](./c7-misplaced-attribute.md)'s.
The rule looks at every BPMN element of a Camunda 7 diagram, executable or not, the event definitions, loops and conditions included; a finding on an event definition, loop or condition is reported on its flow node or flow. The content of an ad-hoc sub-process in an executable process is skipped, as the engines skip it.

## Examples

👎 Invalid: `camunda:asignee` on the user task

![A user task with the attribute camunda:asignee](./assets/c7-unknown-attribute-invalid.svg)

👍 Valid: `camunda:assignee`

![A user task with the attribute camunda:assignee](./assets/c7-unknown-attribute-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:userTask id="userTask_approveOrder" camunda:asignee="demo" />
```

👍 right:

```xml
<bpmn:userTask id="userTask_approveOrder" camunda:assignee="demo" />
```

## Further reading

- [Camunda 7: Extension attributes](https://docs.camunda.org/manual/latest/reference/bpmn20/custom-extensions/extension-attributes/): every camunda attribute and the elements it applies to.

## Related

- [`@miragon/rules/c7-misplaced-attribute`](./c7-misplaced-attribute.md): known attributes where the engines do not read them.
- [`@miragon/rules/c8-unknown-attribute`](./c8-unknown-attribute.md): the same check for Camunda 8.
