# bpmnlint-rules — Claude Code plugin

Write your team's BPMN conventions down once and enforce them everywhere. `build-bpmn-styleguide`
interviews you and writes a `BPMN_STYLE_GUIDE.md`: a handbook people can read, with YAML annotations that
tools can parse. It also writes a `.bpmnlintrc` for the rules bpmnlint can check, built on
[`@miragon/bpmnlint-plugin-rules`](https://github.com/Miragon/bpmnlint-rules). The modeler, CI and
[`@miragon/bpmn-cli`](https://github.com/Miragon/bpmn-cli) then all read the same conventions.
`validate-bpmn-style` checks models against the whole guide. That includes the conventions only
judgement can check, such as whether a task name is verb + noun.

## Installation

From the Miragon marketplace:

```bash
/plugin marketplace add Miragon/skills
/plugin install bpmnlint-rules@miragon-agent-skills
```

Or straight from this repository:

```bash
/plugin marketplace add Miragon/bpmnlint-rules
/plugin install bpmnlint-rules@miragon-bpmnlint
```

The generated `.bpmnlintrc` needs the linter in the project:

```bash
npm i -D bpmnlint @miragon/bpmnlint-plugin-rules
```

## Included skills

| Skill                   | Description                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build-bpmn-styleguide` | Interactively create a `BPMN_STYLE_GUIDE.md` with team conventions for naming, IDs, layout and engine special cases, plus the matching `.bpmnlintrc`.                 |
| `validate-bpmn-style`   | Check BPMN files against `BPMN_STYLE_GUIDE.md`: bpmnlint for the mapped rules, regex or judgement for the rest. Reports each violation with the convention it breaks. |

```
/bpmnlint-rules:build-bpmn-styleguide
/bpmnlint-rules:validate-bpmn-style [path/to/file.bpmn]
```

Or describe what you need and Claude picks the skill.

## Included subagent

| Subagent                    | Description                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bpmn-styleguide-validator` | Wraps `validate-bpmn-style` so XML parsing and rule-by-rule judgement stay out of the main context, or fans validation out (one subagent per file). |

Invoke it with `@bpmnlint-rules:bpmn-styleguide-validator`, or let Claude delegate.

## With bpmn-to-code

The guide doesn't depend on [bpmn-to-code](https://github.com/Miragon/bpmn-to-code). If you use it,
its `generate-rules-to-enforce-bpmn-styleguide` skill turns the guide's `pattern` rules into Kotlin tests
for `bpmn-to-code-testing`.
