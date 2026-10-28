# `@miragon/rules/c8-listener`

> This rule is an `error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports execution and task listeners Camunda 8 refuses to deploy.

## Why

A listener runs a job worker when an element starts or ends, or when a user task changes. Camunda 8
checks every listener at deploy time and refuses the whole file when one of them has no event type,
an event type it does not know, or sits where it cannot run: a start listener on a start or boundary
event, an end listener on a gateway, execution listeners on a sequence flow, or task listeners on a
user task that is not a Camunda user task. One listener added for auditing then blocks the
deployment of the process it was meant to observe. camunda-compat only checks that a listener names
its job type.

## Scope

The rule looks at the `zeebe:executionListeners` and `zeebe:taskListeners` of every element of an
executable process and reports:

- an execution listener without `eventType`, or with one other than `start` and `end` (from
  Camunda 8.10 also `beforeAll` and `cancel`, whose placement camunda-compat checks),
- a `start` listener on a start event or a boundary event,
- an `end` listener on a gateway,
- execution listeners on a sequence flow,
- task listeners on a user task without `zeebe:userTask` (a job worker user task),
- a task listener without `eventType`, or with one other than `creating`, `assigning`,
  `updating`, `completing` and `canceling` (the older `create`, `assignment`, `update`,
  `complete` and `cancel` too).

A listener without `type` is left to camunda-compat's `execution-listener` and `task-listener`.

## Examples

👎 Invalid: a start listener on the start event

![A start event with a start listener](./assets/c8-listener-invalid.svg)

👍 Valid: an end listener on the start event

![A start event with an end listener](./assets/c8-listener-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:startEvent id="startEvent_orderReceived">
  <bpmn:extensionElements>
    <zeebe:executionListeners>
      <zeebe:executionListener eventType="start" type="auditOrder" />
    </zeebe:executionListeners>
  </bpmn:extensionElements>
</bpmn:startEvent>
```

👍 right:

```xml
<bpmn:startEvent id="startEvent_orderReceived">
  <bpmn:extensionElements>
    <zeebe:executionListeners>
      <zeebe:executionListener eventType="end" type="auditOrder" />
    </zeebe:executionListeners>
  </bpmn:extensionElements>
</bpmn:startEvent>
```

## Further reading

- [Camunda 8: Execution listeners](https://docs.camunda.io/docs/components/concepts/execution-listeners/): which event types each element supports.
- [Camunda 8: User task listeners](https://docs.camunda.io/docs/components/concepts/user-task-listeners/): the task listener event types.

## Related

- [`@miragon/rules/c7-listener`](./c7-listener.md): the listener check for Camunda 7.
- [`@miragon/rules/c8-misplaced-extension`](./c8-misplaced-extension.md): task listeners on an element that is no user task.
