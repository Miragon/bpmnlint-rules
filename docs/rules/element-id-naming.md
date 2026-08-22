# `@miragon/rules/element-id-naming`

> This rule is **off** in `plugin:@miragon/rules/recommended-for-modeling` (id conventions matter once a process is executable, not while modeling). It is a non-blocking `warn` in `plugin:@miragon/rules/recommended-for-automation` and an `error` in `plugin:@miragon/rules/all`. Set it to `warn`, `error` or `off` yourself to override.

Reports an element whose ID does not follow the project's naming convention.

## Why

Wherever an element ID surfaces (a test assertion, an incident in monitoring, a generated constant, a
diff) someone has to read it and know what it points at. A naming convention makes that instant: the
prefix says what type the element is, the name says what it does, so a developer or a business
stakeholder recognises the step without opening the model. Without one the same ID is just a string.

```
serviceTask_claimMembership     what it is, and what it does
Activity_0049ryx                neither
```

## Why this matters for agentic BPMN

An agent navigates a model by its IDs: to identify an element, describe a change, or apply a
targeted edit, it needs IDs that are structured and categorisable. Without a prefix convention the
IDs are arbitrary strings that carry no type information a machine can key off.

**Typical AI artifact without this rule:** a mix of `Activity_1`, `task_claim` and
`ServiceTask_Claim` for elements of the same kind: no shared shape an agent can rely on to tell a
gateway from a task from a flow.

**What this rule guarantees:** every ID follows one `<typePrefix>_<Name>` convention, so both a
reviewer and an agent can read an element's type and purpose straight off its ID and address it
unambiguously.

## Default convention

A camelCase element-type prefix plus a camelCase name.

| Element type                                                                       | Prefix              |
| ---------------------------------------------------------------------------------- | ------------------- |
| `bpmn:StartEvent`                                                                  | `startEvent_`       |
| `bpmn:EndEvent`                                                                    | `endEvent_`         |
| `bpmn:BoundaryEvent`, `bpmn:IntermediateCatchEvent`, `bpmn:IntermediateThrowEvent` | `event_`            |
| `bpmn:ServiceTask`                                                                 | `serviceTask_`      |
| `bpmn:UserTask`                                                                    | `userTask_`         |
| `bpmn:SendTask` / `ReceiveTask` / `ManualTask` / `ScriptTask`                      | `sendTask_`, …      |
| `bpmn:BusinessRuleTask`                                                            | `businessRuleTask_` |
| `bpmn:Task`                                                                        | `task_`             |
| `bpmn:CallActivity`                                                                | `callActivity_`     |
| `bpmn:SubProcess`                                                                  | `subProcess_`       |
| `bpmn:Gateway` (every kind)                                                        | `gateway_`          |
| `bpmn:SequenceFlow`                                                                | `flow_`             |

Types are resolved by exact `$type` first, then by inheritance, so `bpmn:Transaction` and
`bpmn:AdHocSubProcess` pick up the sub-process convention, and every gateway kind picks up
`gateway_`, without being listed. Because the exact `$type` wins over the inheritance fallback,
switching a concrete type off with `false` (or overriding it) also stops it from inheriting a base
convention — and the concrete task types each need their own entry, since the default map lists them
individually rather than only `bpmn:Task`.

Two things are intentionally left out. `bpmn:Process` is not covered: a process ID is a public
contract (the deployment key, and what a call activity references), not a diagram-internal
identifier. Any type not in the table is skipped too, so an exotic element nobody configured never
produces a report.

## Event-definition qualifiers

An event id may optionally name its event definition — `messageStartEvent_membershipRequested`
instead of `startEvent_membershipRequested`. The accepted set is derived from the element's _own_
`<bpmn:*EventDefinition>` children, so a qualifier that matches passes and a qualifier that lies is
reported. The qualifier is the definition name lowercased (`bpmn:TimerEventDefinition` → `timer`):
`message`, `timer`, `signal`, `conditional`, `escalation`, `error`, `link`, `terminate`,
`compensate`. It is prepended to whatever prefix the type resolves to (`startEvent_` →
`timerStartEvent_`, a custom `boundaryEvent_` → `messageBoundaryEvent_`).

`eventDefinitionQualifier` controls this:

| mode                 | accepted for a message start event with prefix `startEvent_` |
| -------------------- | ------------------------------------------------------------ |
| `optional` (default) | `startEvent_…` **or** `messageStartEvent_…`                  |
| `required`           | `messageStartEvent_…` only (plain prefix when no definition) |
| `off`                | `startEvent_…` only                                          |

```
startEvent_membershipRequested          👍 always valid
messageStartEvent_membershipRequested   👍 the element IS a message start event
timerStartEvent_membershipRequested     👎 no timer event definition on this element
```

The default `optional` only _widens_ what passes, so enabling the rule never rejects an id that was
valid before. A lying qualifier gets its own message —
`Element id claims a timer event, but this element has no timer event definition` — separate from the
plain wrong-prefix / wrong-case one.

## Configuration

```json
{
  "rules": {
    "@miragon/rules/element-id-naming": [
      "error",
      {
        "prefixes": { "bpmn:SequenceFlow": "Flow_", "bpmn:ScriptTask": false },
        "case": "snake_case",
        "eventDefinitionQualifier": "optional"
      }
    ]
  }
}
```

- `prefixes`: merged over the defaults, so you only state what differs. `false` switches a type
  off entirely.
- `case`: the shape of the part after the prefix: `camelCase` (default), `PascalCase`,
  `snake_case` or `any`.
- `eventDefinitionQualifier`: whether an event id may name its event definition — `optional`
  (default), `required` or `off`. See [Event-definition qualifiers](#event-definition-qualifiers).

## Examples

👎 Invalid: readable labels, but IDs with no type prefix (`ReviewOrder`, not `serviceTask_reviewOrder`)

![Invalid model: IDs off the naming convention](./assets/element-id-naming-invalid.svg)

👍 Valid: the same model with `<typePrefix>_<Name>` IDs

![Valid model: IDs on the naming convention](./assets/element-id-naming-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="Activity_0049ryx" name="Claim membership" />
<bpmn:serviceTask id="serviceTask_ClaimMembership" name="Claim membership" />
<bpmn:serviceTask id="task_claimMembership" name="Claim membership" />
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_claimMembership" name="Claim membership" />
```

## Further reading

- [Camunda: Naming technically relevant IDs](https://docs.camunda.io/docs/components/best-practices/modeling/naming-technically-relevant-ids/): "Define developer-friendly and business-relevant IDs" with a structured type-prefix convention (e.g. `Task_ReviewTweet`, `Gateway_TweetApproved`).
- [Camunda: Naming BPMN elements](https://docs.camunda.io/docs/components/best-practices/modeling/naming-bpmn-elements/): name a task "using an object and a verb", which is what the name part encodes.

## Related

- [`@miragon/rules/no-generated-ids`](./no-generated-ids.md): the subset of this rule that needs no
  convention agreed on first.
