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

Only `src/rules/miragon/` holds rule source we author. `src/core/` is the bpmnlint contract (types,
`defineRule`, `SeverityPolicy`); `src/toolkit/` holds BPMN knowledge future rules can reuse
(`diagram/`, `geometry/`, `naming/`, `engine/`). Code goes to `toolkit/` when it can be named and
tested without mentioning a specific rule — how many rules use it today does not matter. A rule's own
opinion (options, defaults, messages, decision policy) stays in its rule folder
(`src/rules/miragon/<rule>/index.ts`, direct imports, no barrel).

## Before saying "done" — the verify gate

Run the nine-command gate from `CONTRIBUTING.md` ("Before opening a PR"); CI runs the same:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run knip \
  && npm run lint:deps && npm test && npm run build && npm run bench && npm run test:distro
```

## Guardrails (easy to break, load-bearing)

- **New rules ship `error` in `miragonStrict` and a non-blocking `warn` in
  `miragonRecommendedForAutomation`; in `miragonRecommendedForModeling` a rule is `off` unless it is
  a non-blocking layout hint, which ships at `warn`** (each rule declares its `kind`;
  `src/core/SeverityPolicy.ts` maps it to these severities). The two
  `recommended-for-*` layers never fail a build on their own — only `strict` is `error`. The one
  exception is `exclusive-gateway-marker-visible`, `error` in the modeling layer, because a gateway
  without its marker is misdrawn. The modeling
  layer must also stay usable on hand-drawn diagrams — never block a modeler on execution-only
  conventions. Engine-specific rules (they set `targetEngine` next to `ruleName`) are `off` in both `recommended-for-*` layers
  and `error` only in `strict`, and skip diagrams for other engines. The scheme rules `worker-topic-naming` and
  `message-name-naming` follow the same `off` / `off` / `error` pattern, because a project has to
  choose its scheme before they can say anything useful.
- **Semver covers the two `recommended-for-*` layers, not `strict`.** A change is breaking
  (`feat!:`) only if it can add an `error` finding under `recommended-for-*`, or removes/renames a
  rule, preset or option, or changes an option's meaning. A new rule, a rule that detects more, a
  stricter default — anything that only changes what `strict` reports — is `feat:`/`fix:`. Full
  policy: [`CONTRIBUTING.md`](CONTRIBUTING.md#semantic-versioning-policy).
- **Exact dependency versions.** No `^`, no `~` (`.npmrc` `save-exact=true`, CI-verified).
- **Classes first.** Behaviour lives in classes (one per file), pure helpers in a `utils/` folder;
  `npm run lint` rejects a top-level function anywhere else. A rule is a class wrapped by
  `defineRule` (`src/core/utils/defineRule.ts`); a layout rule extends `PlaneRule`.
- **`src/core/` and `src/toolkit/` never import upwards, and a rule never imports another rule** —
  enforced by `npm run lint:deps`. Reusable logic goes in `src/toolkit/`; `npm run knip` catches
  exports imported nowhere.
- **Rules must be deterministic and free of false positives.** When in doubt keep a rule out of
  the `recommended-for-*` layers or ship it at `warn`. Layout rules decide on DI coordinates, never on guesswork.
