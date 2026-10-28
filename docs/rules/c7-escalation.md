# `@miragon/rules/c7-escalation`

> This rule is an `error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports escalation throw events without an escalation or an `escalationCode`, and escalation
boundary events on an activity that cannot escalate.

## Why

Camunda 7 matches a thrown escalation to its catcher by `escalationCode`. It refuses to deploy an
escalation intermediate throw or end event without `escalationRef`, or one whose escalation has no
(or a blank) `escalationCode`. It also allows escalation boundary events only on sub-processes,
call activities and user tasks, and refuses the file when one sits on another task. Either way the
whole process stays undeployed.

## Scope

In executable processes the rule checks the escalation definition the engine acts on of every
intermediate throw and end event, and the host of every boundary event with an escalation
definition. Non-executable processes and the content of ad-hoc sub-processes are skipped.

## Examples

👎 Invalid: the escalation the end event throws has no escalationCode

![An escalation end event whose escalation has no escalationCode](./assets/c7-escalation-invalid.svg)

👍 Valid: the escalation has an escalationCode

![An escalation end event whose escalation has an escalationCode](./assets/c7-escalation-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:escalation id="escalation_paymentDelayed" name="paymentDelayed" />
```

👍 right:

```xml
<bpmn:escalation id="escalation_paymentDelayed" name="paymentDelayed" escalationCode="paymentDelayed" />
```

## Further reading

- [Camunda 7: Escalation events](https://docs.camunda.org/manual/latest/reference/bpmn20/events/escalation-events/): where escalations may be thrown and caught.

## Related

- [`@miragon/rules/c7-error`](./c7-error.md): the same check for errors.
