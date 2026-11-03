# Presets

<!--@include: ../README.md#presets-->

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
