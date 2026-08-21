# `@miragon/rules/no-generated-ids`

> This rule is **off** in `plugin:@miragon/rules/recommended-for-modeling` (id conventions matter once a process is executable, not while modeling). It is a non-blocking `warn` in `plugin:@miragon/rules/recommended-for-automation` and an `error` in `plugin:@miragon/rules/all`. Set it to `warn`, `error` or `off` yourself to override.

Reports IDs that were generated rather than chosen.

## Why

An element ID is not diagram-internal. A process test asserts against it
(`hasPassed("serviceTask_reviewRequest")`), and monitoring labels a running instance or an incident
with it (Camunda Operate, Cockpit). So a developer debugging a failing test and a business
stakeholder watching an incident in monitoring both read that ID straight, and a generated token like
`Activity_0049ryx` tells neither of them which step it is. It also churns on every regeneration, so a
test pinned to it and its line in a diff break for no reason.

Unlike [`element-id-naming`](./element-id-naming.md) this rule enforces no convention of its own,
which makes it the cheap first step for a codebase that has not agreed on one yet:

```json
{
  "extends": "bpmnlint:recommended",
  "rules": { "@miragon/rules/no-generated-ids": "error" }
}
```

## Why this matters for agentic BPMN

This is the highest-yield check for an AI-authored model. An agent extending a diagram copies the
modeler's habit of stamping a random token and repeats it on every edit. Nothing downstream
complains, so without this rule the model quietly fills with IDs that mean nothing to the next reader
or agent.

**Typical AI artifact without this rule:** a freshly added
`<bpmn:serviceTask id="Activity_0049ryx">` sitting next to hand-named elements, unstable across
edits and impossible to reference from a generated constant or a test.

**What this rule guarantees:** every element carries a chosen, stable ID, so diffs stay readable and
any tool, test or agent can point at an element by a name that survives the next edit.

## What counts as generated

Two patterns, both taken from real modeler output rather than guessed at:

- **A random token**: `Activity_0049ryx`, `Gateway_1x9j8k7`, `Flow_0a1b2c3`. bpmn-io's modeler
  emits a 7-character base-36 token; the rule accepts 6 to 8 for tolerance. The token must mix
  letters _and_ digits, which is what separates it from a real word: a random modeler token
  always contains a digit, and an ordinary word in that length window does not, so `flow_nospots`
  and `task_invoice` are safe.
- **A bare counter**: `StartEvent_1`, `Flow_2`, the older modeler form.

A second underscore disqualifies both, so a deliberate `userTask_Approve_2` is left alone.

## Scope

Flow nodes, sequence flows, participants and lanes: the things a reviewer points at. Message,
error and signal names are engine correlation keys and are left to the engine.

## Examples

👎 Invalid: every ID is a generated token

![Invalid model: generated IDs](./assets/no-generated-ids-invalid.svg)

👍 Valid: the same model with chosen, readable IDs

![Valid model: readable IDs](./assets/no-generated-ids-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="Activity_0049ryx" name="Review request" />
<bpmn:startEvent id="StartEvent_1" name="Request received" />
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_ReviewRequest" name="Review request" />
<bpmn:startEvent id="startEvent_RequestReceived" name="Request received" />
```

## Further reading

- [Camunda: Naming technically relevant IDs](https://docs.camunda.io/docs/components/best-practices/modeling/naming-technically-relevant-ids/): the case for chosen, developer-friendly IDs over the modeler's auto-generated tokens.
