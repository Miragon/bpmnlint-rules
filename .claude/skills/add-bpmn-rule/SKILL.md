---
name: add-bpmn-rule
description: 'Adds a new rule to @miragon/bpmnlint-plugin-rules end to end: implementation, wiring, tests, docs and the verify gate. Use when adding a new bpmnlint rule.'
---

# /add-bpmn-rule

The repeatable standard for adding one Miragon rule to `@miragon/bpmnlint-plugin-rules`. Follow the
steps in order; each ends green before the next. The _why_ and the bar for a rule live in
[`CONTRIBUTING.md`](../../../CONTRIBUTING.md#writing-a-new-rule) — this skill is the mechanical
version. Use `<name>` for the kebab-case rule name (e.g. `flow-connection-side`).

## Before you start — is it a rule?

- **Deterministic** from the moddle tree or the DI coordinates (never judgment).
- **No false positives.** When in doubt ship it at `warn` or keep it out of `recommended`.
- **Not already covered** by core bpmnlint or `bpmnlint-plugin-camunda-compat`.

Templates to copy from, by shape:

- `src/rules/miragon/no-generated-ids.ts` — simplest (per-element, no config).
- `src/rules/miragon/element-id-naming.ts` — takes config.
- `src/rules/miragon/flow-through-element.ts` — DI/geometry (extends `PlaneRule` from
  `src/lib/di/`, which runs once on `bpmn:Definitions` and hands it one `DiagramPlane` at a time).

## 1. Rule file — `src/rules/miragon/<name>.ts`

The rule is a class implementing `Rule` (`check(node, reporter)`); the file's only export is
`defineRule({ ruleName, kind }, RuleClass)` — the factory bpmnlint calls. Filter by type inside
`check`; early-return means no report. Put reusable, linter-free logic in `src/lib/` (typed against
`ModdleElement`/`Reporter`/`Rule` from `src/lib/moddle.ts`) — never import another rule. Classes
first: no top-level functions outside a `utils/` folder (ESLint enforces it), so a rule's helpers
are private methods.

```ts
import { isAny } from 'bpmnlint-utils';

import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';
import { defineRule } from '../../lib/utils/defineRule';

/** One sentence: what this reports and why. */
class <ClassName> implements Rule {
  check(node: ModdleElement, reporter: Reporter): void {
    if (!isAny(node, ['bpmn:FlowNode'])) {
      return;
    }
    // ...decide from node / DI coordinates...
    reporter.report(node.id, 'Human-readable, actionable message');
  }
}

export default defineRule({ ruleName: '<name>', kind: 'convention' }, <ClassName>);
```

The declaration is how the rule states its own name and kind: `index.ts` keys the registry by
`ruleName` and the `MiragonRuleName` type derives from it. A configurable rule takes its config in
the constructor.

For a geometry rule, extend `PlaneRule` and implement `checkPlane(plane, reporter)` instead — see
`flow-through-element.ts`. Geometry math belongs in `src/lib/geometry/` (pure, no BPMN), DI reading
in `src/lib/di/`.

## 2. Wire it in — `src/rules/miragon/index.ts`

Everything else (`plugin.ts` path map, `resolverEntries`, the tsup entry glob) derives from this
file. Make three edits:

1. `import <camelName> from './<name>';`
2. Add to `ruleFactoriesByName`: `[<camelName>.ruleName]: <camelName>,`
3. Re-export the factory in the trailing `export { ... }`.

The `kind` in the rule's `defineRule` declaration sets its severity in every layer via
`SEVERITY_BY_KIND` in `src/lib/SeverityPolicy.ts`: `layout-hint` (warn/warn/error), `misdrawn`
(error/warn/error), `convention` (off/warn/error), `scheme` (off/off/error), `engine-specific`
(off/off/error — also declare `targetEngine: 'c7'` and skip diagrams for other engines). Columns
are modeling/automation/all.

## 3. Spec — `test/rules/<name>.spec.ts`

bpmnlint's `RuleTester` + the `model()` fixture builder (inline geometry, no `.bpmn` file needed).
**Every exclusion the rule makes needs a `valid` case** whose geometry would otherwise trip it —
otherwise the exclusion is untested.

```ts
import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/<name>';
import { model } from '../support/model';

verify('<name>', rule, {
  valid: [
    { name: 'the good case', moddleElement: model({ shapes: [/* ... */], edges: [/* ... */] }) },
  ],
  invalid: [
    {
      name: 'the bad case',
      moddleElement: model({ shapes: [/* ... */] }),
      report: { id: '<offenderId>', message: '<exact message>' },
    },
  ],
});
```

`model({ shapes, edges })` (see `test/support/model.ts`) writes a full DI layer; give shapes
`x/y/width/height` and edges `waypoints` when geometry matters, omit them when it doesn't. Pure
helpers added to `src/lib/` get their own direct unit `verify`/`expect` cases.

## 4. Fixtures + docs

- `test/fixtures/rules/<name>/valid.bpmn` and `invalid.bpmn` — real BPMN with DI. These are held to
  the plugin's strictest bar by `test/rules/fixtures-self-lint.spec.ts` (self-enrolling from the
  folder — no wiring), which lints each through `bpmnlint:recommended` + `plugin:@miragon/rules/all`:
  - `valid.bpmn` must be **clean against every rule** — a complete, labeled process (start/end
    events, nothing disconnected, labels on tasks/events/forking gateways and conditional flows),
    with ids on the `<typePrefix>_<camelCase>` convention (`src/lib/naming/ElementIdConvention.ts`). Not just clean w.r.t.
    the new rule.
  - `invalid.bpmn` is the same clean model with **exactly one intentional defect**: it must trip the
    new rule (on the element the doc points at) and nothing may be flagged on any other element.
- Register the pair in `test/rules/examples.spec.ts`: add `'<name>': '<id>'` to `OFFENDER_BY_RULE`
  (the offender id the `invalid` model reports). It is keyed by `MiragonRuleName`, so
  `npm run typecheck` fails until you do.
- `docs/rules/<name>.md` — **copy the template** at
  [`docs/assets/rule-doc-template.md`](../../../docs/assets/rule-doc-template.md), fill the
  placeholders, and delete its guidance block. The template is the single source of truth for a
  rule page: the section order (H1 `` `@miragon/rules/<name>` ``, severity blockquote, one-line
  summary, **Why**, **Why this matters for agentic BPMN**, a scope section, optional
  **Configuration**, **## Examples** embedding `./assets/<name>-invalid.svg` and `-valid.svg`
  (👎 / 👍) with wrong/right snippets, **Further reading**, optional **Related**) and the wording
  rules every page follows. Match those rules exactly — above all, **no dash as punctuation** (no
  `—`, `–` or spaced `-` breaking a sentence; use a comma, colon, parentheses or two sentences),
  so pages don't read as machine-written. Every existing page under `docs/rules/` already conforms,
  so any of them doubles as a worked example.
- README: add a row to the **## Rules** table linking `docs/rules/<name>.md`.
- Render the SVGs: `npm run docs:examples` (needs network + Chromium). If unavailable, land the
  `.bpmn` fixtures + docs now and regenerate the assets later — `examples.spec.ts` only needs the
  fixtures.

## 5. Target time — `test/bench/targets.ts`

Add `'<name>': 50,` to `targetTimeMsAt5000Nodes`: the median time in ms the rule may take on the
5,000-flow-node model. The map is keyed by `MiragonRuleName`, so `npm run typecheck` fails until the
entry exists. Then run `npm run bench` and read the rule's row:

- **`5,000` over the target:** make the rule faster. Raise the target only with a measured reason
  (e.g. the rule reports on every element of the benchmark model).
- **`5k / 2k` at 4 or above:** the rule is not linear (linear is about 2.5, quadratic about 6.25).
  Replace the pairwise loop with an index, see `BboxIndex` in `src/lib/geometry/`.

## 6. Verify gate (must be green)

```bash
npm run typecheck && npm run lint && npm run format:check && npm run knip \
  && npm run lint:deps && npm test && npm run build && npm run bench && npm run test:distro
```

Optionally `npm run docs:examples` first, and `npm run lint:bpmn` after building to dogfood.

## 7. Commit

Conventional Commits. A new rule added only to `all` is `feat:`; adding it to `recommended` or
raising a severity is `feat!:` (it can turn a consumer's build red). Keep dependency versions exact
(no `^`/`~`).
