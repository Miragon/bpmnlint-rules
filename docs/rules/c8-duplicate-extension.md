# `@miragon/rules/c8-duplicate-extension`

> This rule is an `error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports two or more of a zeebe extension element Camunda 8 reads once per element.

## Why

An element carries one job definition, one set of mappings, one assignment and so on. When a file
holds two `zeebe:taskDefinition` or two `zeebe:ioMapping` on one element, Camunda 8 cannot tell
which one is meant and refuses the whole file. This happens when a template is applied twice or an
edit adds a new element instead of changing the existing one, and the diagram looks unchanged.

## Scope

The rule counts the zeebe extension elements Camunda 8 reads on each element of an executable
process (and on the messages it uses) and reports a second one of `zeebe:ioMapping`,
`zeebe:taskHeaders`, `zeebe:properties`, `zeebe:taskDefinition`, `zeebe:formDefinition`,
`zeebe:assignmentDefinition`, `zeebe:priorityDefinition`, `zeebe:taskSchedule`,
`zeebe:calledElement`, `zeebe:calledDecision`, `zeebe:loopCharacteristics`, `zeebe:subscription`,
`zeebe:script`, `zeebe:userTask`, `zeebe:versionTag`, `zeebe:executionListeners`,
`zeebe:taskListeners`, `zeebe:linkedResources`, `zeebe:adHoc` and `zeebe:conditionalFilter`.
Extension elements on an element that does not read them are left to
[`c8-misplaced-extension`](./c8-misplaced-extension.md).

## Examples

👎 Invalid: two task definitions on one service task

![A service task with two task definitions](./assets/c8-duplicate-extension-invalid.svg)

👍 Valid: one task definition

![A service task with one task definition](./assets/c8-duplicate-extension-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:extensionElements>
  <zeebe:taskDefinition type="chargeCard" />
  <zeebe:taskDefinition type="chargeCreditCard" />
</bpmn:extensionElements>
```

👍 right:

```xml
<bpmn:extensionElements>
  <zeebe:taskDefinition type="chargeCard" />
</bpmn:extensionElements>
```

## Further reading

- [Camunda 8: Service tasks](https://docs.camunda.io/docs/components/modeler/bpmn/service-tasks/): the task definition and headers of a job worker task.

## Related

- [`@miragon/rules/c7-duplicate-extension`](./c7-duplicate-extension.md): the same check for Camunda 7.
