# `@miragon/rules/c8-ad-hoc-sub-process`

> This rule is `an error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports a start or end event inside an ad-hoc sub-process.

## Why

An ad-hoc sub-process has no fixed order: its activities are activated as they are needed. Camunda 8
refuses to deploy a file whose ad-hoc sub-process contains a start or an end event, so one stray
event drawn into the container stops the deployment of the whole file. camunda-compat does not
check it.

## Scope

The rule looks at every ad-hoc sub-process of the executable processes of a Camunda 8 diagram and
reports each start and end event directly inside it, on the event. An ad-hoc sub-process without
any activity is left to camunda-compat's `ad-hoc-sub-process`.

## Examples

👎 Invalid: an ad-hoc sub-process with a start event

![An ad-hoc sub-process with a start event](./assets/c8-ad-hoc-sub-process-invalid.svg)

👍 Valid: the ad-hoc sub-process with activities only

![The ad-hoc sub-process with activities only](./assets/c8-ad-hoc-sub-process-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:adHocSubProcess id="subProcess_prepareOrder">
  <bpmn:startEvent id="startEvent_pickingStarted" />
  <bpmn:task id="task_pickItems" />
</bpmn:adHocSubProcess>
```

👍 right:

```xml
<bpmn:adHocSubProcess id="subProcess_prepareOrder">
  <bpmn:task id="task_pickItems" />
</bpmn:adHocSubProcess>
```

## Further reading

- [Camunda 8: Ad-hoc sub-processes](https://docs.camunda.io/docs/components/modeler/bpmn/ad-hoc-subprocesses/): what an ad-hoc sub-process may contain.
