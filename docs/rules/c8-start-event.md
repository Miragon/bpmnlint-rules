# `@miragon/rules/c8-start-event`

> This rule is `an error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports a triggered start event of an embedded sub-process, and several start events in one sub-process.

## Why

An embedded sub-process starts when the flow reaches it, so Camunda 8 accepts only a none start event
there. The engine also needs exactly one start event in a sub-process or an event sub-process.
A timer or message on the start event of an embedded sub-process, or a second start event, stops the
deployment of the whole file.

## Scope

The rule looks at the sub-processes of the executable processes of a Camunda 8 diagram, outside
transactions and ad-hoc sub-processes. A process without a start event and a sub-process without a
start event are left to bpmnlint's `start-event-required`, two none start events of a process to
camunda-compat's `no-multiple-none-start-events`.

## Examples

👎 Invalid: the start event of an embedded sub-process has a timer

![The start event of an embedded sub-process has a timer](./assets/c8-start-event-invalid.svg)

👍 Valid: the embedded sub-process starts with a none start event

![The embedded sub-process starts with a none start event](./assets/c8-start-event-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:subProcess id="subProcess_collectPayment">
  <bpmn:startEvent id="startEvent_paymentDue">
    <bpmn:timerEventDefinition />
  </bpmn:startEvent>
</bpmn:subProcess>
```

👍 right:

```xml
<bpmn:subProcess id="subProcess_collectPayment">
  <bpmn:startEvent id="startEvent_paymentDue" />
</bpmn:subProcess>
```

## Further reading

- [Camunda 8: Embedded sub-processes](https://docs.camunda.io/docs/components/modeler/bpmn/embedded-subprocesses/): how a sub-process starts.

## Related

- [`@miragon/rules/c8-event-definition`](./c8-event-definition.md): event definitions Camunda 8 refuses, including a none start of an event sub-process.
