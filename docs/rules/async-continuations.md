# `@miragon/rules/async-continuations`

> This rule is **off** in both `plugin:@miragon/rules/recommended-for-modeling` and `plugin:@miragon/rules/recommended-for-automation` (it is a Camunda 7 execution concern, and Camunda names legitimate exceptions). It is an `error` in `plugin:@miragon/rules/all`. Set it to `warn`, `error` or `off` yourself to override.

Reports Camunda 7 save points (`camunda:asyncBefore`, `camunda:asyncAfter`) that are missing where your save-point policy requires them, or set where it forbids them. The default policy follows Camunda's recommendations, and every BPMN element can be configured on its own.

## Why

Camunda 7 runs a process in one database transaction from wait state to wait state. When a step
fails, everything since the last wait state rolls back. Without a save point a user's task
completion is undone because a service call after it failed, a side effect runs a second time on
retry, or the incident shows up in Cockpit at an activity that did nothing wrong. An on-call operator
then retries the wrong step, and the user has to complete the same task again.

None of this is visible in the modeler: a diagram with and without save points looks the same. An
`asyncBefore` on a wait state goes the other way. The engine already commits there, so the extra job
only adds load on the job executor.

## Why this matters for agentic BPMN

An agent generating a Camunda 7 process writes the delegate expressions and form keys it was asked
for and leaves the transaction attributes out, because nothing in the request mentions them. The
model deploys and runs on the happy path, so the missing boundaries surface only in production when
the first remote call fails.

**Typical AI artifact without this rule:** `<bpmn:serviceTask id="serviceTask_chargeCard" camunda:delegateExpression="${chargeCardDelegate}">` directly after a user task without `asyncAfter`, so a failing payment rolls the user's approval back.

**What this rule guarantees:** every Camunda 7 element carries the save points your policy requires
and none it forbids. By default that is Camunda's recommendation: a save point where Camunda asks
for one, and no redundant `asyncBefore` on a wait state.

## Scope

The rule only checks Camunda 7 diagrams: `modeler:executionPlatform="Camunda Platform"` on the
definitions, or no execution platform but the `camunda:` namespace declared. Camunda 8 and plain
BPMN diagrams are skipped.

Every flow node maps to exactly one key: the most specific one that fits, so an external service
task is `externalServiceTasks`, not `serviceTasks`. Each key has two slots, `before`
(`camunda:asyncBefore`, or the legacy `camunda:async`) and `after` (`camunda:asyncAfter`), and each
slot is one of:

- `required`: reported when the flag is missing
- `allowed`: never reported
- `forbidden`: reported when the flag is set

The rule only looks at the element itself, never at its neighbours.

On a **multi-instance activity** there are two levels:

- the flags on the element belong to the multi-instance body, once before and once after all
  instances, and follow `multiInstanceBodies`
- the flags on its `multiInstanceLoopCharacteristics` belong to each single instance and follow the
  key of the activity itself, so a multi-instance user task needs `asyncAfter` on its loop
  characteristics and a multi-instance service task `asyncBefore` on both levels

Start events of sub-processes and event sub-processes, and complex gateways, have no key and are
not checked.

### Defaults

| Key                                      | Element                                                   | `before`    | `after`    |
| ---------------------------------------- | --------------------------------------------------------- | ----------- | ---------- |
| `serviceTasks`                           | service task                                              | `required`  | `allowed`  |
| `externalServiceTasks`                   | service task with `camunda:type="external"`               | `forbidden` | `allowed`  |
| `sendTasks`                              | send task                                                 | `required`  | `allowed`  |
| `externalSendTasks`                      | external send task                                        | `forbidden` | `allowed`  |
| `businessRuleTasks`                      | business rule task                                        | `allowed`   | `allowed`  |
| `externalBusinessRuleTasks`              | external business rule task                               | `forbidden` | `allowed`  |
| `scriptTasks`                            | script task                                               | `required`  | `allowed`  |
| `userTasks`                              | user task                                                 | `forbidden` | `required` |
| `receiveTasks`                           | receive task                                              | `forbidden` | `allowed`  |
| `manualTasks`                            | manual task                                               | `allowed`   | `allowed`  |
| `undefinedTasks`                         | task without a type                                       | `allowed`   | `allowed`  |
| `callActivities`                         | call activity                                             | `allowed`   | `allowed`  |
| `subProcesses`                           | sub-process                                               | `allowed`   | `allowed`  |
| `startEvents`                            | start event directly inside a process                     | `required`  | `allowed`  |
| `timerStartEvents`                       | timer start event directly inside a process               | `forbidden` | `allowed`  |
| `intermediateCatchEvents`                | intermediate catch event                                  | `forbidden` | `allowed`  |
| `intermediateThrowEvents`                | intermediate throw event without a message                | `allowed`   | `allowed`  |
| `messageIntermediateThrowEvents`         | message intermediate throw event                          | `required`  | `allowed`  |
| `externalMessageIntermediateThrowEvents` | message intermediate throw event with an external message | `forbidden` | `allowed`  |
| `endEvents`                              | end event without a message                               | `allowed`   | `allowed`  |
| `messageEndEvents`                       | message end event                                         | `required`  | `allowed`  |
| `externalMessageEndEvents`               | message end event with an external message                | `forbidden` | `allowed`  |
| `boundaryEvents`                         | boundary event (no `before` slot)                         | —           | `allowed`  |
| `parallelGateways`                       | forking parallel gateway                                  | `allowed`   | `allowed`  |
| `parallelJoins`                          | parallel gateway with more than one incoming flow         | `required`  | `allowed`  |
| `inclusiveGateways`                      | forking inclusive gateway                                 | `allowed`   | `allowed`  |
| `inclusiveJoins`                         | inclusive gateway with more than one incoming flow        | `required`  | `allowed`  |
| `exclusiveGateways`                      | exclusive gateway                                         | `allowed`   | `allowed`  |
| `eventBasedGateways`                     | event-based gateway                                       | `forbidden` | `allowed`  |
| `multiInstanceBodies`                    | multi-instance activity, flags on the element             | `required`  | `allowed`  |

A timer start event already fires as a job, so there is no caller to hand the instance back to, and
an `asyncBefore` there only adds a second job. External tasks are wait states: the worker fetches
them from the engine, so an `asyncBefore` on them is redundant.

## Configuration

`"preset": "minimal"` turns every default `allowed` into `forbidden` and keeps every `required`,
for teams that want as few save points as possible. A key set to an object overrides the slots it
names, and a key set to `false` allows both of its slots. An unknown key or value stops the lint
run with an error, so a mistyped or outdated option never falls back to the defaults unnoticed:

```json
{
  "rules": {
    "@miragon/rules/async-continuations": [
      "error",
      {
        "preset": "minimal",
        "callActivities": { "before": "allowed" },
        "externalServiceTasks": { "after": "required" },
        "userTasks": false
      }
    ]
  }
}
```

With `minimal`, a task with `asyncAfter` directly in front of a multi-instance body with
`asyncBefore` is reported for its `asyncAfter`, and the body's `asyncBefore` stays required.

### Migrating from 0.20

| Before                 | Now                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `serviceTasks: false`  | `serviceTasks: false`, plus `sendTasks`, `scriptTasks`, `messageIntermediateThrowEvents` and `messageEndEvents` set to `false` if those were meant too |
| `userTasks: false`     | `userTasks: { "after": "allowed" }`                                                                                                                    |
| `startEvents: false`   | `startEvents: false`                                                                                                                                   |
| `joins: false`         | `parallelJoins: false`, `inclusiveJoins: false`                                                                                                        |
| `multiInstance: false` | `multiInstanceBodies: false`                                                                                                                           |
| `waitStates: false`    | `false` on `receiveTasks`, `intermediateCatchEvents`, `eventBasedGateways` and the `external*` keys, and `userTasks: { "before": "allowed" }`          |

## Examples

An order payment process in Camunda 7: a user approves the order, then the card is charged. Each
red bar is a transaction boundary, drawn by
[camunda-transaction-boundaries](https://github.com/bpmn-io/camunda-transaction-boundaries): Camunda 7
commits there and a new transaction starts.

👎 Invalid: no boundary in front of "Charge card", so a failing payment shows up as an incident on the job after "Approve order" instead of on "Charge card"

![Invalid model: no transaction boundary before Charge card](./assets/async-continuations-invalid.svg)

👍 Valid: "Charge card" starts behind its own boundary, so its retries and incidents belong to it

![Valid model: a transaction boundary before Charge card](./assets/async-continuations-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" name="Charge card"
  camunda:delegateExpression="${chargeCardDelegate}" />
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" name="Charge card"
  camunda:asyncBefore="true" camunda:delegateExpression="${chargeCardDelegate}" />
```

## Further reading

- [Camunda: Understanding Camunda 7 transaction handling](https://unsupported.docs.camunda.io/8.7/docs/components/best-practices/development/understanding-transaction-handling-c7/#knowing-typical-dos-and-donts-for-save-points): the do's and don'ts for save points this rule implements.
- [Camunda 7 Manual: Transactions in processes](https://docs.camunda.org/manual/latest/user-guide/process-engine/transactions-in-processes/): how wait states and asynchronous continuations define transaction boundaries.
