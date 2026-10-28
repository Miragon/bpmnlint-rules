# `@miragon/rules/c7-link-event`

> This rule is an `error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports link events without a name, link catch names used twice in a process, and link throw
events without a catch event in their (sub-)process.

## Why

A link throw event jumps to the link catch event of its name. Camunda 7 resolves the jump within the
throw event's own (sub-)process, but requires catch names to be unique in the whole process, sub-processes
included. It refuses the file when two catch events share a name anywhere in the process, when a
reached throw event has no catch event of its name in its scope, or when a link definition has no
name, which the BPMN schema requires. `bpmnlint`'s own `link-event` rule checks
each (sub-)process on its own and does not see a catch name reused in a sub-process.

## Scope

The missing name is checked for every link definition in the file, also in a non-executable process.
In executable processes, outside ad-hoc sub-processes, the rule reports the second and later catch
events of a name (in document order) and every throw event a sequence flow leads to whose
(sub-)process has no catch event of its name. A throw event nothing leads to, and a catch event
without a throw event, are left alone.

## Examples

👎 Invalid: the link pair in the sub-process reuses the name of the pair in the process

![A link pair in a sub-process that reuses the name of the process's link pair](./assets/c7-link-event-invalid.svg)

👍 Valid: each link pair has its own name

![Two link pairs with their own names](./assets/c7-link-event-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:intermediateCatchEvent id="event_payment">
  <bpmn:linkEventDefinition name="payment" />
</bpmn:intermediateCatchEvent>
<bpmn:subProcess id="subProcess_chargeCard">
  <bpmn:intermediateCatchEvent id="event_charge">
    <bpmn:linkEventDefinition name="payment" />
  </bpmn:intermediateCatchEvent>
</bpmn:subProcess>
```

👍 right:

```xml
<bpmn:intermediateCatchEvent id="event_payment">
  <bpmn:linkEventDefinition name="payment" />
</bpmn:intermediateCatchEvent>
<bpmn:subProcess id="subProcess_chargeCard">
  <bpmn:intermediateCatchEvent id="event_charge">
    <bpmn:linkEventDefinition name="charge" />
  </bpmn:intermediateCatchEvent>
</bpmn:subProcess>
```

## Further reading

- [Camunda 7: Link events](https://docs.camunda.org/manual/latest/reference/bpmn20/events/link-events/): how link events connect parts of a process.

## Related

- [`@miragon/rules/c8-link-event`](./c8-link-event.md): the link checks for Camunda 8.
