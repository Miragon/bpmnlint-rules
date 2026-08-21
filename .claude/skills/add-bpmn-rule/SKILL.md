---
name: add-bpmn-rule
description: "Use when adding a new Miragon bpmnlint rule to @miragon/bpmnlint-plugin-rules (or when the user says 'add a rule', 'new lint rule', /add-bpmn-rule). The standard playbook for a rule end-to-end — implementation, wiring, tests, docs and the verify gate — so every rule lands the same way."
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
- `src/rules/miragon/flow-through-element.ts` — DI/geometry (dispatches on `bpmn:Definitions`, walks
  planes via `src/lib/di.ts#collectByPlane`, uses `src/lib/geometry.ts`).

## 1. Rule file — `src/rules/miragon/<name>.ts`

`export default` a factory returning `{ check(node, reporter) }`. Filter by type inside `check`;
early-return means no report. Put reusable, linter-free logic in `src/lib/` (typed against
`ModdleElement`/`Reporter`/`Rule` from `src/lib/moddle.ts`) — never import another rule.

```ts
import { isAny } from 'bpmnlint-utils';

import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

/** One sentence: what this reports and why. */
export default function <name>(): Rule {
  function check(node: ModdleElement, reporter: Reporter): void {
    if (!isAny(node, ['bpmn:FlowNode'])) {
      return;
    }
    // ...decide from node / DI coordinates...
    reporter.report(node.id, 'Human-readable, actionable message');
  }

  return { check };
}
```

For a geometry rule, gate on `node.$type === 'bpmn:Definitions'` and iterate `collectByPlane(node)`
instead — see `flow-through-element.ts`. Geometry math belongs in `src/lib/geometry.ts` (pure, no
BPMN), DI reading in `src/lib/di.ts`.

## 2. Wire it in — `src/rules/miragon/index.ts`

Everything else (`plugin.ts` path map, `resolverEntries`, the tsup entry glob) derives from this
file. Make four edits:

1. `import <camelName> from './<name>';`
2. Add to `miragonRuleFactories`: `'<name>': <camelName>,`
3. Add it at `'error'` to `miragonAll` and at `'warn'` to `miragonRecommendedForAutomation`. In
   `miragonRecommendedForModeling` add it `'off'`, unless it is a non-blocking layout hint safe on
   hand-drawn diagrams (those ship at `'warn'`). All keyed `` `${MIRAGON_NAME}/<name>` ``. Each
   config lists its rules explicitly — no shared spread — so severities stay obvious per config.
4. Add to the matching tag set (`visualRules` for layout/geometry, `namingRules` for id/naming), and
   re-export the factory in the trailing `export { ... }`.

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
    with ids on the `<typePrefix>_<camelCase>` convention (`src/lib/naming.ts`). Not just clean w.r.t.
    the new rule.
  - `invalid.bpmn` is the same clean model with **exactly one intentional defect**: it must trip the
    new rule (on the element the doc points at) and nothing may be flagged on any other element.
- Register the pair in `test/rules/examples.spec.ts`: add `{ rule: '<name>', offender: '<id>' }` to
  `EXAMPLES` (the offender id the `invalid` model reports).
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

## 5. Verify gate (must be green)

```bash
npm run typecheck && npm run lint && npm run format:check && npm run knip \
  && npm run lint:deps && npm test && npm run build && npm run test:distro
```

Optionally `npm run docs:examples` first, and `npm run lint:bpmn` after building to dogfood.

## 6. Commit

Conventional Commits. A new rule added only to `all` is `feat:`; adding it to `recommended` or
raising a severity is `feat!:` (it can turn a consumer's build red). Keep dependency versions exact
(no `^`/`~`).
