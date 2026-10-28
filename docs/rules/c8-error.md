# `@miragon/rules/c8-error`

> This rule is `an error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports error catch events Camunda 8 refuses: a FEEL error code, a non-interrupting error event, and one error code twice in a scope.

## Why

An error catch event matches thrown errors by a static code, and an error always interrupts what
threw it. Camunda 8 refuses to deploy a file in which a catching error event has a FEEL error code,
is non-interrupting, or shares its code (or its catch-all) with another error event of the same
scope: the boundary events of one activity, or the start events of the event sub-processes of one
(sub-)process.

## Scope

The rule looks at the executable processes of a Camunda 8 diagram, outside transactions. A thrown
error without an error reference or code is left to camunda-compat's `error-reference`.

## Examples

👎 Invalid: a non-interrupting error boundary event

![A non-interrupting error boundary event](./assets/c8-error-invalid.svg)

👍 Valid: an interrupting error boundary event

![An interrupting error boundary event](./assets/c8-error-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:boundaryEvent id="event_cardDeclined" cancelActivity="false" attachedToRef="serviceTask_chargeCard">
  <bpmn:errorEventDefinition errorRef="error_cardDeclined" />
</bpmn:boundaryEvent>
```

👍 right:

```xml
<bpmn:boundaryEvent id="event_cardDeclined" attachedToRef="serviceTask_chargeCard">
  <bpmn:errorEventDefinition errorRef="error_cardDeclined" />
</bpmn:boundaryEvent>
```

## Further reading

- [Camunda 8: Error events](https://docs.camunda.io/docs/components/modeler/bpmn/error-events/): how errors are thrown and caught.

## Related

- [`@miragon/rules/c8-message`](./c8-message.md): the same duplicate check for messages.
