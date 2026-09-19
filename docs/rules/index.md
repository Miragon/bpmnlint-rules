# Rules

The Miragon conventions this plugin adds. Every rule has its own page with a reported and a clean
example, the reasoning and its options.

<PresetTable />

Start with the group pages for the reasoning and side-by-side examples: [Naming](./naming.md) and
[Layout](./layout.md).

## Bundled layers

The plugin also carries two third-party rule sets, so one install covers all three layers:

| Layer      | Comes from                                                                                    | Switch on with                                                    |
| ---------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Structural | [`bpmnlint:recommended`](https://github.com/bpmn-io/bpmnlint/blob/main/docs/rules/README.md)  | `"bpmnlint:recommended"`                                          |
| Engine     | [`bpmnlint-plugin-camunda-compat`](https://github.com/camunda/bpmnlint-plugin-camunda-compat) | `"plugin:camunda-compat/..."`, see [Engines](../guide/engines.md) |
| Miragon    | this plugin                                                                                   | `"plugin:@miragon/rules/..."`, see [Presets](../presets.md)       |
