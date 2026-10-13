# Presets

<!--@include: ../README.md#presets-->

## Severity per rule

<PresetTable />

Only `all` reports at `error`, so only `all` can fail a build on a Miragon finding. Override any
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
