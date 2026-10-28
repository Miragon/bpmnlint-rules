# `@miragon/rules/c7-event-definition`

> This rule is an `error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports timers without a value, conditional events without a condition, timers with more than one
time element, and compensation events that name an activity outside their scope.

## Why

Camunda 7 refuses each of these files at deploy, so the whole process stays undeployed:

- A timer needs a `timeDate`, `timeCycle` or `timeDuration` to schedule its job.
- The BPMN schema, which the engine validates the whole file against, requires a `condition` in
  every conditional event definition and allows at most one time element per timer.
- A compensation throw event compensates activities of its own (sub-)process only. An
  `activityRef` to an activity elsewhere, or to something that is not an activity, is refused.

## Scope

The schema checks (conditional without `condition`, a timer with two or three time elements) hold
for every event definition in the file: also one the engine ignores because the event has several
definitions, and one in a non-executable process. The other checks hold in executable processes,
outside ad-hoc sub-processes, for the definition the engine acts on: a timer without value, and the
`activityRef` of a compensation intermediate throw or end event. An event sub-process may also
compensate the activities of its parent scope.

## Examples

👎 Invalid: a timer catch event without a duration

![A timer catch event without a value](./assets/c7-event-definition-invalid.svg)

👍 Valid: the timer waits one hour

![A timer catch event that waits one hour](./assets/c7-event-definition-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:intermediateCatchEvent id="event_oneHourPassed">
  <bpmn:timerEventDefinition />
</bpmn:intermediateCatchEvent>
```

👍 right:

```xml
<bpmn:intermediateCatchEvent id="event_oneHourPassed">
  <bpmn:timerEventDefinition>
    <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">PT1H</bpmn:timeDuration>
  </bpmn:timerEventDefinition>
</bpmn:intermediateCatchEvent>
```

## Further reading

- [Camunda 7: Timer events](https://docs.camunda.org/manual/latest/reference/bpmn20/events/timer-events/): the time elements a timer takes.
- [Camunda 7: Conditional events](https://docs.camunda.org/manual/latest/reference/bpmn20/events/conditional-events/): the condition of a conditional event.
- [Camunda 7: Cancel and compensation events](https://docs.camunda.org/manual/latest/reference/bpmn20/events/cancel-and-compensation-events/): what a compensation throw event may compensate.

## Related

- [`@miragon/rules/c7-multiple-event-definitions`](./c7-multiple-event-definitions.md): which definition of several the engine acts on.
- [`@miragon/rules/c7-empty-condition`](./c7-empty-condition.md): a condition without an expression.
- [`@miragon/rules/c7-link-event`](./c7-link-event.md): the link definition the schema requires a name for.
