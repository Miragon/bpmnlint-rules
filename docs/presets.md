# Presets

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

## Severity per rule

<PresetTable />

Only `strict` reports at `error`, so only `strict` can fail a build on a Miragon finding.
`strict` is not covered by semver: a minor release may add rules or widen what they report. Pin
the exact version, or build your own config from a `recommended-for-*` preset if your build must
stay green across minors. Override any
single rule in your own `.bpmnlintrc`. This one extends the structural rules and the modeling
preset, raises `no-generated-ids` to `error` and silences `flow-crossing`:

```json
{
  "extends": [
    "bpmnlint:recommended",
    "plugin:@miragon/rules/recommended-for-modeling"
  ],
  "rules": {
    "@miragon/rules/no-generated-ids": "error",
    "@miragon/rules/flow-crossing": "off"
  }
}
```
