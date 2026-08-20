# @miragon/bpmnlint-plugin-rules

[![npm version](https://img.shields.io/npm/v/@miragon/bpmnlint-plugin-rules.svg)](https://www.npmjs.com/package/@miragon/bpmnlint-plugin-rules)
[![CI](https://github.com/Miragon/bpmnlint-rules/actions/workflows/ci.yml/badge.svg)](https://github.com/Miragon/bpmnlint-rules/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A [bpmnlint](https://github.com/bpmn-io/bpmnlint) plugin that keeps BPMN diagrams clean: a few
Miragon naming and layout conventions, plus the standard structural rules and the Camunda 7 / 8
deployability rules bundled in — so you don't wire up bpmnlint's plugins yourself.

## Why

A BPMN diagram can be well-formed and still be wrong — a missing start event, a construct the engine
rejects at deploy, or forty tasks named `Activity_0049ryx` that no reviewer can read. Linting catches
that automatically, wherever BPMN is written:

- **In the modeler** — live feedback while you draw, so a mistake is flagged the moment you make it.
- **In CI** — a merge/deploy gate, so a broken model never ships.
- **For AI** — agents emit valid-but-off models (machine IDs, orphan nodes, engine-invalid
  constructs); lint their output and block on error, instead of hoping a human catches it.

Most teams already have these conventions — in a wiki, or in one reviewer's head. This plugin makes
them executable.

## Install

Install the plugin together with `bpmnlint` (its peer dependency):

```bash
npm install --save-dev @miragon/bpmnlint-plugin-rules bpmnlint
```

## Use it (the bpmnlint way)

Add the plugin to your `.bpmnlintrc` and extend one of its configs, like any other plugin:

```jsonc
// .bpmnlintrc
{
  "extends": [
    "bpmnlint:recommended", // standard structural rules
    "plugin:@miragon/rules/recommended", // the Miragon layer
  ],
}
```

It ships two configs:

- `plugin:@miragon/rules/recommended` — bpmnlint's `standard-size` at `warn`; the Miragon rules
  present but **off**, so adding it to an existing project changes nothing until you opt in.
- `plugin:@miragon/rules/all` — every Miragon rule at `error`.

Then lint a diagram:

```bash
npx bpmnlint diagram.bpmn
```

## Rules

The Miragon conventions this plugin adds — each with a docs page and a good/bad example:

| Rule                                                                        | What it catches                                                       |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`@miragon/rules/no-generated-ids`](docs/rules/no-generated-ids.md)         | IDs generated rather than chosen (`Activity_0049ryx`, `StartEvent_1`) |
| [`@miragon/rules/element-id-naming`](docs/rules/element-id-naming.md)       | IDs that don't follow the type-prefix + case convention               |
| [`@miragon/rules/flow-through-element`](docs/rules/flow-through-element.md) | A sequence flow routed through an unrelated shape's body              |
| [`@miragon/rules/flow-connection-side`](docs/rules/flow-connection-side.md) | A sequence flow docked onto the wrong side of a shape                 |

Turn any of them on individually, the usual way:

```jsonc
{
  "extends": ["bpmnlint:recommended", "plugin:@miragon/rules/recommended"],
  "rules": {
    "@miragon/rules/no-generated-ids": "error",
    "@miragon/rules/element-id-naming": "warn",
  },
}
```

Structural checks — start/end events, connectivity, element sizing — come from bpmnlint's own
[`bpmnlint:recommended`](https://github.com/bpmn-io/bpmnlint/blob/main/docs/rules/README.md). The
Miragon set grows over time; see [CONTRIBUTING.md](CONTRIBUTING.md) to propose a rule.

## In CI

Lint every model as a merge gate — bpmnlint exits non-zero on a finding, failing the build:

```bash
npx bpmnlint 'models/**/*.bpmn'
```

## Camunda engine rules

Deploying to a Camunda engine? Add its deployability layer (bundled — no separate install) to your
`extends`:

| Engine            | Add to `extends`                              |
| ----------------- | --------------------------------------------- |
| Camunda 7         | `plugin:camunda-compat/camunda-platform-7-24` |
| Camunda 8 (Zeebe) | `plugin:camunda-compat/camunda-cloud-8-10`    |

These rules read engine properties, so point bpmnlint at the matching moddle extension in your
`.bpmnlintrc`:

```jsonc
{
  "extends": ["bpmnlint:recommended", "plugin:camunda-compat/camunda-cloud-8-10"],
  "moddleExtensions": { "zeebe": "zeebe-bpmn-moddle/resources/zeebe.json" },
}
```

For Camunda 7, use `"camunda": "camunda-bpmn-moddle/resources/camunda.json"`. Prefer to skip the
wiring? The programmatic `getDefaultLintConfig({ engine })` below sets up both the layer and its
moddle extension for you.

## Programmatic use

Building a linter in code — a modeler, a CI script, an agent loop? Skip `.bpmnlintrc` and use the
bundled resolver. It carries every layer (structural + Camunda + Miragon), so there's nothing else
to wire up, and it works offline:

```ts
import BpmnModdle from 'bpmn-moddle';
import Linter from 'bpmnlint/lib/linter';
import { createBundledResolver, getDefaultLintConfig } from '@miragon/bpmnlint-plugin-rules';

const { rootElement } = await new BpmnModdle().fromXML(xml);

const linter = new Linter({
  config: getDefaultLintConfig({ engine: 'c8' }), // 'c7' | 'c8' — omit for structural-only
  resolver: createBundledResolver(),
});

const results = await linter.lint(rootElement);
```

Results are keyed by rule; each finding has a `category` (`error` | `warn`). Block on any error — a
CI gate, or the reject signal that sends an AI agent back to fix its output:

```ts
const errors = Object.values(results)
  .flat()
  .filter((finding) => finding.category === 'error');

if (errors.length) process.exit(1);
```

Every rule factory, rule-set and helper is exported from the package root as well.

## Where it is used

- **[Miragon BPMN Modeler](https://github.com/Miragon/bpmn-modeler)** — in-editor linting via the
  programmatic API, flagging issues live while you model.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Miragon GmbH.
