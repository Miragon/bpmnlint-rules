# `@miragon/rules/camunda-7-async-continuations`

> This rule is **off** in both `plugin:@miragon/rules/recommended-for-modeling` and `plugin:@miragon/rules/recommended-for-automation` (it is a Camunda 7 execution concern, and Camunda names legitimate exceptions). It is an `error` in `plugin:@miragon/rules/all`. Set it to `warn`, `error` or `off` yourself to override.

Reports Camunda 7 save points (`camunda:asyncBefore`, `camunda:asyncAfter`) that are missing where Camunda recommends them, and `asyncBefore` flags on elements that are already wait states.

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

**What this rule guarantees:** every Camunda 7 element where Camunda recommends a save point has
one, and no wait state carries a redundant `asyncBefore`.

## Scope

The rule only checks Camunda 7 diagrams: `modeler:executionPlatform="Camunda Platform"` on the
definitions, or no execution platform but the `camunda:` namespace declared. Camunda 8 and plain
BPMN diagrams are skipped.

| Check           | Element                                                                               | Expects          |
| --------------- | ------------------------------------------------------------------------------------- | ---------------- |
| `serviceTasks`  | service, script and send task; message intermediate throw and message end event       | `asyncBefore`    |
| `userTasks`     | user task                                                                             | `asyncAfter`     |
| `startEvents`   | start event directly inside a process                                                 | `asyncBefore`    |
| `joins`         | parallel or inclusive gateway with more than one incoming flow                        | `asyncBefore`    |
| `multiInstance` | any activity with multi-instance loop characteristics                                 | `asyncBefore`    |
| `waitStates`    | user task, receive task, intermediate catch event, event-based gateway, external task | no `asyncBefore` |

The rule deliberately leaves these alone:

- **External tasks** (`camunda:type="external"` on a service, send or business rule task, or on the
  message definition of a throw event) are wait states. They need no `asyncBefore`, and one there is
  reported as redundant.
- **Multi-instance activities** may carry `asyncBefore` even when they are a wait state: on a
  multi-instance activity the flag belongs to the multi-instance body.
- **Start events of sub-processes and event sub-processes** are not checked.
- **Forking gateways** and exclusive gateways are not checked.
- The legacy `camunda:async="true"` counts as `asyncBefore`.

An element reports at most one missing `asyncBefore` (multi-instance first), so a multi-instance
service task is not reported twice. A user task can still get two reports: one for a redundant
`asyncBefore` and one for a missing `asyncAfter`.

## Configuration

Every check is on by default. Switch one off where your process deliberately differs, for example
`userTasks` when a later step validates the user's input and a rollback should return to the task.

```json
{
  "rules": {
    "@miragon/rules/camunda-7-async-continuations": [
      "error",
      {
        "serviceTasks": true,
        "userTasks": false,
        "startEvents": true,
        "joins": true,
        "multiInstance": true,
        "waitStates": true
      }
    ]
  }
}
```

| Option          | Default | Effect                                                                   |
| --------------- | ------- | ------------------------------------------------------------------------ |
| `serviceTasks`  | `true`  | Require `asyncBefore` on service, script, send tasks and message throws. |
| `userTasks`     | `true`  | Require `asyncAfter` on user tasks.                                      |
| `startEvents`   | `true`  | Require `asyncBefore` on process start events.                           |
| `joins`         | `true`  | Require `asyncBefore` on parallel and inclusive joins.                   |
| `multiInstance` | `true`  | Require `asyncBefore` on multi-instance activities.                      |
| `waitStates`    | `true`  | Report `asyncBefore` on wait states.                                     |

## Examples

An order payment process in Camunda 7: a user approves the order, then the card is charged. Each
red bar is a transaction boundary, drawn by
[camunda-transaction-boundaries](https://github.com/bpmn-io/camunda-transaction-boundaries): Camunda 7
commits there and a new transaction starts.

👎 Invalid: no boundary in front of "Charge card", so a failing payment shows up as an incident on the job after "Approve order" instead of on "Charge card"

![Invalid model: no transaction boundary before Charge card](./assets/camunda-7-async-continuations-invalid.svg)

👍 Valid: "Charge card" starts behind its own boundary, so its retries and incidents belong to it

![Valid model: a transaction boundary before Charge card](./assets/camunda-7-async-continuations-valid.svg)

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
