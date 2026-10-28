# `@miragon/rules/c7-misplaced-extension`

> This rule is `a warning` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a camunda extension element where Camunda 7 does not read it.

## Why

Each camunda extension element is read on certain hosts only: a task listener on a user task,
`camunda:in` on a call activity, `camunda:inputOutput` on a flow node. Elsewhere the engines ignore
it, so a listener on a service task never fires and a mapping on the process never runs. The file
deploys and the configured behaviour is silently missing.

## Scope

The rule reports a camunda extension element on a host type the engines do not read it on, one that
belongs inside another camunda element (a `camunda:property` outside `camunda:properties`), and the
content of an event definition the engines read on one side only (`camunda:field` and
`camunda:connector` on a message catch event, `camunda:in` on a signal catch event). Elements the
typed parse already drops, such as a `camunda:inputParameter` outside `camunda:inputOutput`, are
not seen. The rule looks at every BPMN element of a Camunda 7 diagram, executable or not, the event definitions, loops and conditions included; a finding on an event definition, loop or condition is reported on its flow node or flow. The content of an ad-hoc sub-process in an executable process is skipped, as the engines skip it.

## Examples

👎 Invalid: a task listener on the service task

![A service task with a task listener](./assets/c7-misplaced-extension-invalid.svg)

👍 Valid: the task listener sits on the user task

![A user task with a task listener](./assets/c7-misplaced-extension-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard">
  <bpmn:extensionElements>
    <camunda:taskListener event="create" delegateExpression="${assignmentListener}" />
  </bpmn:extensionElements>
</bpmn:serviceTask>
```

👍 right:

```xml
<bpmn:userTask id="userTask_approveOrder">
  <bpmn:extensionElements>
    <camunda:taskListener event="create" delegateExpression="${assignmentListener}" />
  </bpmn:extensionElements>
</bpmn:userTask>
```

## Further reading

- [Camunda 7: Extension elements](https://docs.camunda.org/manual/latest/reference/bpmn20/custom-extensions/extension-elements/): every camunda extension element and where the engine reads it.

## Related

- [`@miragon/rules/c7-misplaced-attribute`](./c7-misplaced-attribute.md): the same check for attributes.
- [`@miragon/rules/c8-misplaced-extension`](./c8-misplaced-extension.md): the same check for Camunda 8.
