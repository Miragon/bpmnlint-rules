# `@miragon/rules/no-generated-ids`

> In `plugin:@miragon/rules/recommended-for-modeling` this rule is **off** (id conventions matter once a process is executable, not while modeling); in `plugin:@miragon/rules/recommended-for-automation` and `plugin:@miragon/rules/all` it is an `error`. Turn it on with either, or set it to `warn`/`error` yourself.

Reports IDs that were generated rather than chosen.

## Why

This is the highest-yield check for an AI-authored model. An agent adding an element copies the
modeler's habit of stamping a random token, and the result is a model whose diff is unreadable
and whose generated constants are meaningless.

Unlike [`element-id-naming`](./element-id-naming.md) it enforces no convention of its own, which
makes it the cheap first step for a codebase that has not agreed on one yet:

```json
{
  "extends": "bpmnlint:recommended",
  "rules": { "@miragon/rules/no-generated-ids": "error" }
}
```

## Why this matters for agentic BPMN

An agent extending a model copies the modeler's habit of stamping a random token
(`Activity_1x2y3z`, `StartEvent_1`). The XML still deploys, so nothing downstream complains — but
the token is a hash or a counter, not a name: it churns on every regeneration and means nothing to
the human or the next agent reading the diff.

**Typical AI artifact without this rule:** a freshly added
`<bpmn:serviceTask id="Activity_0049ryx">` sitting next to hand-named elements — unstable across
edits and impossible to reference from a generated constant or a test.

**What this rule guarantees:** every element carries a chosen, stable ID, so diffs stay readable and
any tool, test or agent can point at an element by a name that survives the next edit.

## What counts as generated

Two shapes, both modelled on real modeler output rather than guessed at:

- **A random token** — `Activity_0049ryx`, `Gateway_1x9j8k7`, `Flow_0a1b2c3`. bpmn-io's modeler
  emits a 7-character base-36 token; the rule accepts 6–8 for tolerance. The token must mix
  letters _and_ digits, which is what separates it from a real word: a random modeler token
  always contains a digit, and an ordinary word in that length window does not — so `flow_nospots`
  and `task_invoice` are safe.
- **A bare counter** — `StartEvent_1`, `Flow_2`, the older modeler form.

A second underscore disqualifies both, so a deliberate `userTask_Approve_2` is left alone.

## Scope

Flow nodes, sequence flows, participants and lanes — the things a reviewer points at. Message,
error and signal names are engine correlation keys and are left to the engine.

## Examples

👎 Invalid — every ID is a generated token

![Invalid model — generated IDs](./assets/no-generated-ids-invalid.svg)

👍 Valid — the same model with chosen, readable IDs

![Valid model — readable IDs](./assets/no-generated-ids-valid.svg)

The same, as XML — 👎 wrong:

```xml
<bpmn:serviceTask id="Activity_0049ryx" name="Review request" />
<bpmn:startEvent id="StartEvent_1" name="Request received" />
```

👍 Right:

```xml
<bpmn:serviceTask id="serviceTask_ReviewRequest" name="Review request" />
<bpmn:startEvent id="startEvent_RequestReceived" name="Request received" />
```

## Further reading

- [Camunda — Naming technically relevant IDs](https://docs.camunda.io/docs/components/best-practices/modeling/naming-technically-relevant-ids/) — the case for chosen, developer-friendly IDs over the modeler's auto-generated tokens.
