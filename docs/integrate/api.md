# CI & programmatic API

## In CI

Lint every model as a merge gate — bpmnlint exits non-zero on a finding, failing the build:

```bash
npx bpmnlint 'models/**/*.bpmn'
```

Only findings at `error` fail the run. The two recommended presets report Miragon findings at `warn`,
so extend `plugin:@miragon/rules/strict` when the gate should block on them. See
[Presets](../presets.md).

## Programmatic API

Building a linter in code — a modeler, a CI script, an agent loop? Skip `.bpmnlintrc` and use the
bundled resolver. It carries every layer (structural + Camunda + Miragon), so there's nothing else
to wire up, and it works offline:

```ts
import { BpmnModdle } from 'bpmn-moddle';
import { Linter } from 'bpmnlint';
import {
  createBundledResolver,
  getDefaultLintConfig,
} from '@miragon/bpmnlint-plugin-rules';

// 'c7' | 'c8', omit for structural-only
const config = getDefaultLintConfig({ engine: 'c8' });

// parse with the config's moddle extensions, or the engine rules
// cannot see the engine properties
const moddle = new BpmnModdle(config.moddleExtensions);
const { rootElement } = await moddle.fromXML(xml);

const linter = new Linter({
  config,
  resolver: createBundledResolver(),
});

const results = await linter.lint(rootElement);
```

`engine` picks the Camunda deployability layer + typed moddle; `preset` picks the Miragon opinion
layer independently — `'modeling'` (layout hints only, safe on hand-drawn diagrams) or
`'automation'` (the naming and layout rules at a non-blocking `warn`). When `preset` is omitted it defaults to
`'automation'` for an engine-bound config and `'modeling'` otherwise. Pass both to decouple them —
e.g. a modeler that wants Camunda 8's typed properties and deployability checks but the relaxed
modeling opinion layer:

```ts
getDefaultLintConfig({ engine: 'c8', preset: 'modeling' });
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
