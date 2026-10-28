# `@miragon/rules/c7-foreign-content`

> This rule is `a warning` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports Camunda 8 (`zeebe:`) attributes and extension elements in a Camunda 7 diagram.

## Why

Camunda 7 ignores everything in the zeebe namespace. A task definition, retry count or mapping
written for Camunda 8 deploys without complaint and does nothing, so a process migrated back from
Camunda 8, or modeled with the wrong template, runs without the behaviour its author configured.

## Scope

The rule reports zeebe attributes on BPMN elements, zeebe extension elements, and zeebe attributes
on camunda extension elements the engines read. The rule looks at every BPMN element of a Camunda 7 diagram, executable or not, the event definitions, loops and conditions included; a finding on an event definition, loop or condition is reported on its flow node or flow. The content of an ad-hoc sub-process in an executable process is skipped, as the engines skip it.

## Examples

👎 Invalid: a zeebe task definition on the service task

![A service task with a zeebe task definition](./assets/c7-foreign-content-invalid.svg)

👍 Valid: the service task is implemented with camunda attributes

![A service task with a camunda delegate expression](./assets/c7-foreign-content-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard">
  <bpmn:extensionElements>
    <zeebe:taskDefinition type="chargeCard" />
  </bpmn:extensionElements>
</bpmn:serviceTask>
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" camunda:delegateExpression="${chargeCardDelegate}" />
```

## Further reading

- [Camunda 7: Extension elements](https://docs.camunda.org/manual/latest/reference/bpmn20/custom-extensions/extension-elements/): every camunda extension element and where the engine reads it.

## Related

- [`@miragon/rules/c8-foreign-content`](./c8-foreign-content.md): camunda content in a Camunda 8 diagram.
