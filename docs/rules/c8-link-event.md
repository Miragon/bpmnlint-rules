# `@miragon/rules/c8-link-event`

> This rule is `an error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports a link throw event without a matching link catch event, and link event definitions without a name.

## Why

A link throw event jumps to the link catch event of the same name in its own process or
sub-process. Camunda 8 refuses to deploy a file in which a throw event names a link that its scope
does not catch, so a renamed or misspelled link stops the deployment. The BPMN schema also requires
a name on every link event definition, and Camunda 8 refuses an empty one.

## Scope

The rule pairs the link events of each executable process of a Camunda 8 diagram, scope by scope,
and reports a throw event whose scope has no catch event of its name. It also reports a link event
definition without a name anywhere in the file, except where camunda-compat's `link-event` already
looks (the first definition of an intermediate event in an executable process). Two catch events of
one name are left to camunda-compat.

## Examples

👎 Invalid: a link throw event goes to a link name nothing catches

![A link throw event goes to a link name nothing catches](./assets/c8-link-event-invalid.svg)

👍 Valid: both throw events go to the link the catch event has

![Both throw events go to the link the catch event has](./assets/c8-link-event-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:intermediateThrowEvent id="event_toShippingWhenLate">
  <bpmn:linkEventDefinition name="shiping" />
</bpmn:intermediateThrowEvent>
<bpmn:intermediateCatchEvent id="event_shipping">
  <bpmn:linkEventDefinition name="shipping" />
</bpmn:intermediateCatchEvent>
```

👍 right:

```xml
<bpmn:intermediateThrowEvent id="event_toShippingWhenLate">
  <bpmn:linkEventDefinition name="shipping" />
</bpmn:intermediateThrowEvent>
<bpmn:intermediateCatchEvent id="event_shipping">
  <bpmn:linkEventDefinition name="shipping" />
</bpmn:intermediateCatchEvent>
```

## Further reading

- [Camunda 8: Link events](https://docs.camunda.io/docs/components/modeler/bpmn/link-events/): how throw and catch events pair up.

## Related

- [`@miragon/rules/c8-event-definition`](./c8-event-definition.md): event definitions Camunda 8 refuses.
