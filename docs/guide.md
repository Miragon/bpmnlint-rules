# Getting started

## Install

Install the plugin together with `bpmnlint` (its peer dependency):

```bash
npm install --save-dev @miragon/bpmnlint-plugin-rules bpmnlint
```

## Use it (the bpmnlint way)

Add the plugin to your `.bpmnlintrc` and extend one of its configs, like any other plugin.
`bpmnlint:recommended` brings the standard structural rules, and the second entry adds the Miragon
layer, here `recommended-for-modeling`:

```json
{
  "extends": [
    "bpmnlint:recommended",
    "plugin:@miragon/rules/recommended-for-modeling"
  ]
}
```

It ships three configs — pick one by who's modeling and why:

- `plugin:@miragon/rules/recommended-for-modeling` — for **purely business/technical models**, and for
  **modeler applications that surface linting** to their users. Layout hints only: bpmnlint's
  `standard-size` and the layout rules at `warn`, the naming/id rules **off** — a modeler is never
  blocked on execution-only conventions. The one `error` is a gateway drawn without its marker,
  because that diagram is misdrawn.
- `plugin:@miragon/rules/recommended-for-automation` — for **developers automating processes**, locally
  and in CI, on models wired up to a Camunda engine. The naming and layout rules on but as a non-blocking
  `warn` (`standard-size` too), so ids and layout get flagged without failing the build. The scheme
  and engine-specific rules stay off.
- `plugin:@miragon/rules/strict` — every Miragon rule at `error`, engine-agnostic. The gate to opt into
  when you want findings to fail the build. Not covered by semver: a minor release may add rules or
  widen what they report. See the
  [semantic versioning policy](https://github.com/Miragon/bpmnlint-rules/blob/main/CONTRIBUTING.md#semantic-versioning-policy).

Then lint a diagram:

```bash
npx bpmnlint diagram.bpmn
```

## Next steps

- [Presets](./presets.md): which of the three configs fits who is modeling.
- [Camunda 7 / 8 engines](./guide/engines.md): add the deployability rules for your engine.
- [CI & programmatic API](./integrate/api.md): run it as a merge gate or from code.
- [Rules](./rules/index.md): every rule with a reported and a clean example.

## What one model cannot tell

bpmnlint lints one model at a time, so it is the right fit for anything stylistic or about the
correctness of a single diagram. It checks naming conventions, layout, structural soundness, and
whether a construct is deployable to a given engine.

However, it cannot answer engine- and automation-specific questions that span a running process, because those
depend on more than the diagram in front of it. Whether a call activity passes every variable its
child process needs, or whether the technical wiring is correct, is something a model-in-isolation
linter simply cannot see. For those cases, and when you want to keep such tests alongside your model
in the same build (for example a Gradle task), [Miragon/bpmn-to-code](https://github.com/Miragon/bpmn-to-code)
and its [process testing](https://github.com/Miragon/bpmn-to-code/pull/79) are the better tool.
