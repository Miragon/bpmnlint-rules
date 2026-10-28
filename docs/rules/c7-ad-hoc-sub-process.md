# `@miragon/rules/c7-ad-hoc-sub-process`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports an ad-hoc sub-process with a sequence flow, a boundary event or a multi-instance loop.

## Why

Camunda 7 does not run ad-hoc sub-processes. It skips one that nothing connects, together with its
content, but refuses the file when a sequence flow enters or leaves it or a boundary event is
attached to it. Camunda 7 and CIB seven also refuse one with a multi-instance loop. A step modeled
as an ad-hoc sub-process therefore stops the deployment, although the modeler draws it like any
other sub-process.

## Scope

The rule looks at the ad-hoc sub-processes of executable processes and reports each one that has
an incoming or outgoing sequence flow or a boundary event, or else a multi-instance loop. An ad-hoc
sub-process inside another one is skipped with its parent. Operaton deploys a valid multi-instance
loop on an ad-hoc sub-process; the rule follows Camunda 7 and reports it.

## Examples

👎 Invalid: the approval step is a connected ad-hoc sub-process

![A connected ad-hoc sub-process](./assets/c7-ad-hoc-sub-process-invalid.svg)

👍 Valid: the approval step is a user task

![A user task in place of the ad-hoc sub-process](./assets/c7-ad-hoc-sub-process-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:adHocSubProcess id="subProcess_approveOrder">
  <bpmn:userTask id="userTask_checkOrder" />
</bpmn:adHocSubProcess>
<bpmn:sequenceFlow sourceRef="startEvent_orderReceived" targetRef="subProcess_approveOrder" />
```

👍 right:

```xml
<bpmn:userTask id="userTask_approveOrder" />
<bpmn:sequenceFlow sourceRef="startEvent_orderReceived" targetRef="userTask_approveOrder" />
```

## Further reading

- [Camunda 7: Embedded sub-process](https://docs.camunda.org/manual/latest/reference/bpmn20/subprocesses/embedded-subprocess/): the sub-process Camunda 7 runs.

## Related

- [`@miragon/rules/c8-ad-hoc-sub-process`](./c8-ad-hoc-sub-process.md): ad-hoc sub-processes in Camunda 8.
- [`@miragon/rules/c7-complex-gateway`](./c7-complex-gateway.md): another element Camunda 7 refuses once it is connected.
