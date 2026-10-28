# `@miragon/rules/c7-dangling-reference`

> This rule is `a warning` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports an `errorRef` inside camunda content that points to an element other than a `bpmn:Error`.

## Why

A `camunda:errorEventDefinition` on an external task maps a worker result to a BPMN error through
its `errorRef`. When the reference names an element that is not an error (an end event, a message),
the file deploys and the engines ignore the mapping when it runs, so the error the worker reports is
never raised.

## Scope

The rule checks the id references of the camunda extension elements on every BPMN element. A
reference to an id that does not exist at all is not seen: the typed parse drops it before the rule
runs. The rule looks at every BPMN element of a Camunda 7 diagram, executable or not, the event definitions, loops and conditions included; a finding on an event definition, loop or condition is reported on its flow node or flow. The content of an ad-hoc sub-process in an executable process is skipped, as the engines skip it.

## Examples

👎 Invalid: the error mapping references the end event

![An external task whose error mapping references an end event](./assets/c7-dangling-reference-invalid.svg)

👍 Valid: the error mapping references the error

![An external task whose error mapping references an error](./assets/c7-dangling-reference-valid.svg)

The same, as XML. 👎 wrong:

```xml
<camunda:errorEventDefinition id="errorEventDefinition_cardDeclined" errorRef="endEvent_paymentFailed" expression="${declined}" />
```

👍 right:

```xml
<camunda:errorEventDefinition id="errorEventDefinition_cardDeclined" errorRef="error_paymentFailed" expression="${declined}" />
```

## Further reading

- [Camunda 7: External tasks, error event definitions](https://docs.camunda.org/manual/latest/user-guide/process-engine/external-tasks/#error-event-definitions): how a worker result is mapped to a BPMN error.

## Related

- [`@miragon/rules/c7-error`](./c7-error.md): errors the engines refuse.
