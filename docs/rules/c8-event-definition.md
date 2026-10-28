# `@miragon/rules/c8-event-definition`

> This rule is `an error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports event definitions Camunda 8 refuses to deploy.

## Why

Camunda 8 reads one trigger per event and checks each definition when the file is deployed. An event
with two definitions, an event sub-process start without a trigger, a conditional, compensation or
link catch definition without an id, a compensation that names an activity of another scope, a
compensation boundary event without an association to its handler (or with an outgoing sequence
flow) and a conditional definition without a condition all stop the deployment of the whole file.
camunda-compat reads only the first definition of an event, so it passes these files.

## Scope

The rule looks at the events of the executable processes of a Camunda 8 diagram, outside
transactions, and at every conditional event definition of the file (the BPMN schema requires the
condition wherever the definition is). Catch and boundary events without a definition and an event
sub-process start with a compensation trigger are left to camunda-compat's `element-type`.

## Examples

👎 Invalid: a message catch event that also carries a timer definition

![A message catch event that also carries a timer definition](./assets/c8-event-definition-invalid.svg)

👍 Valid: the message catch event with one definition

![The message catch event with one definition](./assets/c8-event-definition-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:intermediateCatchEvent id="event_paymentReceived">
  <bpmn:messageEventDefinition messageRef="message_paymentReceived" />
  <bpmn:timerEventDefinition />
</bpmn:intermediateCatchEvent>
```

👍 right:

```xml
<bpmn:intermediateCatchEvent id="event_paymentReceived">
  <bpmn:messageEventDefinition messageRef="message_paymentReceived" />
</bpmn:intermediateCatchEvent>
```

## Further reading

- [Camunda 8: Events](https://docs.camunda.io/docs/components/modeler/bpmn/events/): the triggers each event type supports.

## Related

- [`@miragon/rules/c8-start-event`](./c8-start-event.md): start events Camunda 8 refuses in sub-processes.
- [`@miragon/rules/c8-link-event`](./c8-link-event.md): link events Camunda 8 refuses.
