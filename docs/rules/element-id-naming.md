# `@miragon/rules/element-id-naming`

> This rule is **off** in `plugin:@miragon/rules/recommended-for-modeling` (id conventions matter once a process is executable, not while modeling), a non-blocking `warn` in `plugin:@miragon/rules/recommended-for-automation`, and an `error` in `plugin:@miragon/rules/all`. Set it to `warn`/`error`/`off` yourself to override.

Reports an element whose ID does not follow the project's naming convention.

## Why

An element ID is not an implementation detail. It is what generated constants reference, what a
reviewer reads in a diff, and what the next agent uses to talk about the model. A convention
makes all three legible at a glance:

```
serviceTask_claimMembership     what it is, and what it does
Activity_0049ryx                neither
```

## Why this matters for agentic BPMN

An agent navigates a model by its IDs: to identify an element, describe a change, or apply a
targeted edit, it needs IDs that are structured and categorisable. Without a prefix convention the
IDs are arbitrary strings that carry no type information a machine can key off.

**Typical AI artifact without this rule:** a mix of `Activity_1`, `task_claim` and
`ServiceTask_Claim` for elements of the same kind — no shared shape an agent can rely on to tell a
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

Types are resolved by exact `$type` first, then by inheritance — so `bpmn:Transaction` and
`bpmn:AdHocSubProcess` pick up the sub-process convention, and every gateway kind picks up
`gateway_`, without being listed.

**`bpmn:Process` is deliberately not covered.** A process ID is a public contract — the
deployment key, and what a call activity references — not a diagram-internal identifier.

**Types that are not configured are not checked.** An exotic BPMN element nobody thought about
must not produce a report.

## Configuration

```json
{
  "rules": {
    "@miragon/rules/element-id-naming": [
      "error",
      {
        "prefixes": { "bpmn:SequenceFlow": "Flow_", "bpmn:ScriptTask": false },
        "case": "snake_case"
      }
    ]
  }
}
```

- `prefixes` — merged over the defaults, so you only state what differs. `false` switches a type
  off entirely.
- `case` — the shape of the part after the prefix: `camelCase` (default), `PascalCase`,
  `snake_case` or `any`.

## Examples

👎 Invalid — readable labels, but IDs with no type prefix (`ReviewOrder`, not `serviceTask_reviewOrder`)

![Invalid model — IDs off the naming convention](./assets/element-id-naming-invalid.svg)

👍 Valid — the same model with `<typePrefix>_<Name>` IDs

![Valid model — IDs on the naming convention](./assets/element-id-naming-valid.svg)

The same, as XML — 👎 wrong:

```xml
<bpmn:serviceTask id="Activity_0049ryx" name="Claim membership" />
<bpmn:serviceTask id="serviceTask_ClaimMembership" name="Claim membership" />
<bpmn:serviceTask id="task_claimMembership" name="Claim membership" />
```

👍 Right

```xml
<bpmn:serviceTask id="serviceTask_claimMembership" name="Claim membership" />
```

## Further reading

- [Camunda — Naming technically relevant IDs](https://docs.camunda.io/docs/components/best-practices/modeling/naming-technically-relevant-ids/) — "Define developer-friendly and business-relevant IDs" with a structured type-prefix convention (e.g. `Task_ReviewTweet`, `Gateway_TweetApproved`).
- [Camunda — Naming BPMN elements](https://docs.camunda.io/docs/components/best-practices/modeling/naming-bpmn-elements/) — name a task "using an object and a verb", which is what the name part encodes.

## Related

- [`@miragon/rules/no-generated-ids`](./no-generated-ids.md) — the subset of this rule that needs no
  convention agreed on first.
