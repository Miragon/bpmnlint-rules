# Style guide → `.bpmnlintrc`

A guide rule goes into `.bpmnlintrc` only when this table lists it. Every other rule keeps its `pattern`
or stays `llm`. bpmnlint enforces the deterministic half; `/validate-bpmn-style` still covers the rest.

## Mapped rules

| Guide rule            | bpmnlint rule                      | Options from the guide                                                                                                                                   |
| --------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `element-id-format`   | `@miragon/rules/element-id-naming` | `prefixes` (only what differs from the defaults, `false` switches a type off), `case`, `eventDefinitionQualifier`. Omit options that equal the defaults. |
| `no-generated-ids`    | `@miragon/rules/no-generated-ids`  | none                                                                                                                                                     |
| `layout-no-crossings` | `@miragon/rules/flow-crossing`     | none                                                                                                                                                     |
| `gateway-flow-labels` | `label-required`                   | none. It also requires labels on tasks, events, forking gateways, pools and lanes, so the guide should say so.                                           |

### `element-id-naming` defaults

A camelCase name after the type prefix: `startEvent_`, `endEvent_`, `event_` (boundary and intermediate
events), `serviceTask_`, `userTask_`, `sendTask_`, `receiveTask_`, `manualTask_`, `scriptTask_`,
`businessRuleTask_`, `task_`, `callActivity_`, `subProcess_`, `gateway_` (every kind), `flow_`.
Process IDs are not covered — keep `process-id-format` as a `pattern` rule.

`case`: `camelCase` (default), `PascalCase`, `snake_case`, `kebab-case`, `any`.

`eventDefinitionQualifier`: `optional` (default) accepts `startEvent_x` and `messageStartEvent_x`;
`required` accepts only the qualified form; `off` only the plain one. The qualifier is the event
definition lowercased: `message`, `timer`, `signal`, `conditional`, `escalation`, `error`, `link`,
`terminate`, `compensate`.

Full reference: <https://github.com/Miragon/bpmnlint-rules/blob/main/docs/rules/element-id-naming.md>.

### Not mapped yet

Message names, service task topics, process IDs, allowed elements and async continuations have no
bpmnlint rule in `@miragon/bpmnlint-plugin-rules`. Keep them as `pattern`, structural or `llm` rules.

## Severity

| Guide `severity` | bpmnlint |
| ---------------- | -------- |
| `error`          | `error`  |
| `warning`        | `warn`   |
| `info`           | `info`   |

## Assembling the file

1. `extends`, in this order:
   - `bpmnlint:recommended`
   - the preset chosen in Phase 1: `plugin:@miragon/rules/recommended-for-automation` or
     `plugin:@miragon/rules/recommended-for-modeling`
   - the engine layer:

     | `Engine:`               | Engine layer                                                 | `moddleExtensions`                                        |
     | ----------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
     | `CAMUNDA_7` (and CIB-7) | `plugin:camunda-compat/camunda-platform-7-24`                | `"camunda": "camunda-bpmn-moddle/resources/camunda.json"` |
     | `ZEEBE`                 | `plugin:camunda-compat/camunda-cloud-8-10`                   | `"zeebe": "zeebe-bpmn-moddle/resources/zeebe.json"`       |
     | `OPERATON`              | none — camunda-compat doesn't read the `operaton:` namespace | none                                                      |

     Use the team's engine version in the config name when it is older (e.g. `camunda-cloud-8-5`).

2. `rules`: one entry per mapped guide rule, `"<rule>": "<severity>"`, or
   `"<rule>": ["<severity>", { ...options }]` when it has options. These override the preset.

The `moddleExtensions` line is required for the engine layer: without it the engine properties are
invisible and the rules report false findings.

## Example

A Camunda 7 guide with `element-id-format` (`error`, defaults), `no-generated-ids` (`error`),
`layout-no-crossings` (`info`) and `gateway-flow-labels` (`error`):

```json
{
  "extends": [
    "bpmnlint:recommended",
    "plugin:@miragon/rules/recommended-for-automation",
    "plugin:camunda-compat/camunda-platform-7-24"
  ],
  "moddleExtensions": {
    "camunda": "camunda-bpmn-moddle/resources/camunda.json"
  },
  "rules": {
    "@miragon/rules/element-id-naming": "error",
    "@miragon/rules/no-generated-ids": "error",
    "@miragon/rules/flow-crossing": "info",
    "label-required": "error"
  }
}
```

The same guide with snake_case names and `Flow_` for sequence flows:

```json
"@miragon/rules/element-id-naming": [
  "error",
  { "prefixes": { "bpmn:SequenceFlow": "Flow_" }, "case": "snake_case" }
]
```
