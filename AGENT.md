# Agent guide — `@miragon/bpmnlint-plugin-rules`

A [bpmnlint](https://github.com/bpmn-io/bpmnlint) plugin: Miragon BPMN naming/layout rules plus the
bundled structural and Camunda 7/8 layers. Package `@miragon/bpmnlint-plugin-rules`, short config
name `@miragon/rules`. Start with [`README.md`](README.md) for what it does and
[`CONTRIBUTING.md`](CONTRIBUTING.md) for how the package is laid out — this file only adds the
short list of things worth loading up front.

## Adding a rule

Use the **`/add-bpmn-rule` skill** (`.claude/skills/add-bpmn-rule/`) — it is the standard playbook
(impl + wiring + tests + docs + verify). The rationale and the bar for a new rule live in
[`CONTRIBUTING.md`](CONTRIBUTING.md#writing-a-new-rule); the skill is the mechanical version.

Only `src/rules/miragon/` holds rule source we author. Shared, linter-free logic goes in `src/lib/`.

## Before saying "done" — the verify gate

Run the eight-command gate from `CONTRIBUTING.md` ("Before opening a PR"); CI runs the same:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run knip \
  && npm run lint:deps && npm test && npm run build && npm run test:distro
```

## Guardrails (easy to break, load-bearing)

- **New rules ship `error` in `miragonAll` and a non-blocking `warn` in
  `miragonRecommendedForAutomation`; in `miragonRecommendedForModeling` a rule is `off` unless it is
  a non-blocking layout hint, which ships at `warn`** (all in `src/rules/miragon/index.ts`). The two
  `recommended-for-*` layers never fail a build on their own — only `all` is `error`. The modeling
  layer must also stay usable on hand-drawn diagrams — never block a modeler on execution-only
  conventions.
- **Preset-aware Conventional Commits.** A change is breaking (`feat!:`) only if it can turn a
  consumer's green build red — i.e. it introduces or raises an `error`-level finding. Since the two
  `recommended-for-*` layers emit only `warn`, adding a rule there is not breaking; raising a rule to
  `error` (in `all`, or a consumer's own config) is. Adding a rule at `warn`, or lowering a severity
  → not breaking.
- **Exact dependency versions.** No `^`, no `~` (`.npmrc` `save-exact=true`, CI-verified).
- **`src/lib/` is a leaf and a rule never imports another rule** — enforced by `npm run lint:deps`.
  Shared logic goes in `src/lib/`; `npm run knip` catches exports imported nowhere.
- **Rules must be deterministic and free of false positives.** When in doubt keep a rule out of
  the `recommended-for-*` layers or ship it at `warn`. Layout rules decide on DI coordinates, never on guesswork.
