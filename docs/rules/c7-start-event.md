# `@miragon/rules/c7-start-event`

> This rule is an `error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a process or sub-process without a start event, a second none or timer start event of a
process, and a second start event of a sub-process.

## Why

Camunda 7 starts a process or an embedded sub-process at its start event. It refuses to deploy a
process or sub-process without one, also an empty one ("process must define a startEvent element").
A process may have only one none or timer start event (message, signal and conditional start
events come on top), and a sub-process exactly one start event. A second one makes the engine
refuse the whole file.

## Scope

The rule checks every process and sub-process the engine runs: executable processes and their
sub-processes, transactions and event sub-processes, but not ad-hoc sub-processes or their content.
For a process with several definitions on one start event, the definition the engine acts on
decides: a message and timer start event counts as a timer start event. A transaction without a
start event deploys and is left to [`c7-transaction-start`](./c7-transaction-start.md); an event
sub-process without a start event is left alone.

## Examples

👎 Invalid: a second, timer start event next to the none start event

![A process with a none and a timer start event](./assets/c7-start-event-invalid.svg)

👍 Valid: the second start event waits for a message

![A process with a none and a message start event](./assets/c7-start-event-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:startEvent id="startEvent_orderReceived" />
<bpmn:startEvent id="startEvent_reminderDue">
  <bpmn:timerEventDefinition>
    <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">R/P1D</bpmn:timeCycle>
  </bpmn:timerEventDefinition>
</bpmn:startEvent>
```

👍 right:

```xml
<bpmn:startEvent id="startEvent_orderReceived" />
<bpmn:startEvent id="startEvent_reminderDue">
  <bpmn:messageEventDefinition messageRef="message_reminderDue" />
</bpmn:startEvent>
```

## Further reading

- [Camunda 7: Start events](https://docs.camunda.org/manual/latest/reference/bpmn20/events/start-events/): the start events a process and a sub-process may have.

## Related

- [`@miragon/rules/c7-transaction-start`](./c7-transaction-start.md): a transaction without a start event.
