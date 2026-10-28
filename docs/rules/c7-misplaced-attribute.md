# `@miragon/rules/c7-misplaced-attribute`

> This rule is `a warning` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a camunda attribute on an element Camunda 7 does not read it on.

## Why

A camunda attribute only works on the element types it applies to: `camunda:assignee` on a user
task, `camunda:collection` on the multi-instance loop, `camunda:errorCodeVariable` on the error
definition of a catching event. Elsewhere the engines ignore it. This typically happens when a task
changes its type or an attribute lands on the activity instead of its loop or event definition, and
the process then runs without it.

## Scope

The rule reports a known camunda attribute on an element type it does not apply to, and the
attributes of an event definition the engines read on one side only: delegate settings
(`camunda:class`, `camunda:type`, `camunda:topic` and the like) on a message catch event,
`camunda:async` on a signal catch event, and the code variables on an error or escalation throw
event. Unknown attributes are [`c7-unknown-attribute`](./c7-unknown-attribute.md)'s. The rule looks at every BPMN element of a Camunda 7 diagram, executable or not, the event definitions, loops and conditions included; a finding on an event definition, loop or condition is reported on its flow node or flow. The content of an ad-hoc sub-process in an executable process is skipped, as the engines skip it.

## Examples

👎 Invalid: `camunda:assignee` on the service task

![A service task with camunda:assignee](./assets/c7-misplaced-attribute-invalid.svg)

👍 Valid: `camunda:assignee` on the user task

![A user task with camunda:assignee](./assets/c7-misplaced-attribute-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" camunda:assignee="demo" />
```

👍 right:

```xml
<bpmn:userTask id="userTask_approveOrder" camunda:assignee="demo" />
```

## Further reading

- [Camunda 7: Extension attributes](https://docs.camunda.org/manual/latest/reference/bpmn20/custom-extensions/extension-attributes/): every camunda attribute and the elements it applies to.

## Related

- [`@miragon/rules/c7-misplaced-extension`](./c7-misplaced-extension.md): the same check for extension elements.
- [`@miragon/rules/c8-misplaced-attribute`](./c8-misplaced-attribute.md): the same check for Camunda 8.
