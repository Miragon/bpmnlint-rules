# Presets

<!--@include: ../README.md#presets-->

## Severity per rule

<PresetTable />

Only `all` reports at `error`, so only `all` can fail a build on a Miragon finding. Override any
single rule in your own config:

```jsonc
// .bpmnlintrc
{
  "extends": [
    "bpmnlint:recommended", // structural rules
    "plugin:@miragon/rules/recommended-for-modeling", // your preset
  ],
  "rules": {
    "@miragon/rules/no-generated-ids": "error", // raise one rule
    "@miragon/rules/flow-crossing": "off", // silence another
  },
}
```
