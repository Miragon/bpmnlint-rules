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

- **New rules ship `off` in `miragonRecommended`, `error` in `miragonAll`** (both in
  `src/rules/miragon/index.ts`) — adopting the Miragon layer must never change a consumer's findings.
- **Preset-aware Conventional Commits.** Adding a rule to `recommended` or raising a severity turns a
  green build red → `feat!:`. Adding only to `all`, or lowering a severity → not breaking.
- **Exact dependency versions.** No `^`, no `~` (`.npmrc` `save-exact=true`, CI-verified).
- **`src/lib/` is a leaf and a rule never imports another rule** — enforced by `npm run lint:deps`.
  Shared logic goes in `src/lib/`; `npm run knip` catches exports imported nowhere.
- **Rules must be deterministic and free of false positives.** When in doubt keep a rule out of
  `recommended` or ship it at `warn`. Layout rules decide on DI coordinates, never on guesswork.
