# Contributing

Thanks for your interest in `@miragon/bpmnlint-plugin-rules`! Contributions of all kinds are welcome —
bug reports, rule ideas, docs and code.

## Getting started

```bash
git clone https://github.com/Miragon/bpmnlint-rules.git
cd bpmnlint-rules
npm ci
npm test
```

This is a single-package TypeScript library, built with [tsup](https://tsup.egoist.dev/) and
tested with [Vitest](https://vitest.dev/). Node >= 22 is required.

## Scripts (the quality gate)

```bash
npm run typecheck     # tsc, no emit
npm run lint          # ESLint
npm run format:check  # Prettier, check only (npm run format to write)
npm run knip          # knip: unused files, dependencies and exports
npm run lint:deps     # dependency-cruiser architecture check
npm test              # rule specs (Vitest, driving bpmnlint's RuleTester)
npm run build         # tsup build into dist/ (ESM + CJS + d.ts)
npm run test:distro   # pack + install the tarball, then drive the bpmnlint CLI + resolver
```

All of these run in CI on Node 22 for every push and pull request. Run them locally before
opening a PR — the "Before opening a PR" section below is the exact sequence.

## How the package is laid out

```
src/rules/common/       the bpmnlint built-in rules (structural base) — static-import glue
src/rules/camunda-7/    the camunda-compat C7 engine layer — static-import glue
src/rules/camunda-8/    the camunda-compat C8 engine layer — static-import glue
src/rules/miragon/      the ONLY folder whose rule source we author (one file per rule) + index
src/lib/                shared helpers — a leaf layer, pure functions over moddle data / geometry
src/resolver/           createBundledResolver: merges every folder's resolver entries
src/config/             engineConfig: getDefaultLintConfig / getRulesForEngine
src/presets/            ready-to-use recommended-for-modeling / -for-automation / all configs
test/                   RuleTester specs, the resolver integration + sync specs, and fixtures
test/fixtures/rules/    valid.bpmn / invalid.bpmn pairs per rule (rendered to the docs SVGs)
docs/rules/             one documentation page per rule
```

Only `src/rules/miragon/` holds rule source we author; `common`, `camunda-7` and `camunda-8` just
enumerate upstream rule modules (bpmnlint / camunda-compat) and map them to resolver cache keys —
`test/rules/camunda-sync.spec.ts` (and `bpmnlint-sync.spec.ts`) fail the build if an upstream bump adds or renames one.

Two boundaries are enforced by `npm run lint:deps` and matter more than they look:

- **A rule may never import another rule.** bpmnlint resolves and instantiates every rule
  independently, so a rule-to-rule import would make one rule's behaviour depend on another's
  internals — invisible from `.bpmnlintrc`. Shared logic goes in `src/lib/`.
- **`src/lib/` stays a leaf.** The helpers are pure functions over geometry and moddle data. That
  is what makes them testable without a linter around them.

`npm run knip` covers what dependency-cruiser structurally cannot: it works per **export**, not
per module, so it catches a helper that is exported but imported nowhere — and unused
dependencies in `package.json`.

## Writing a new rule

1. **Rule file.** Add `src/rules/miragon/<name>.ts`. It `export default`s a factory returning
   `{ check(node, reporter) }` — see bpmnlint's
   [plugin docs](https://github.com/bpmn-io/bpmnlint/blob/main/docs/plugins/README.md). Keep any
   reusable, linter-free logic in `src/lib/` (typed against `ModdleElement`/`Reporter` from
   `src/lib/moddle.ts`).
2. **Spec + fixtures.** Add `test/rules/<name>.spec.ts` using `bpmnlint`'s `RuleTester`, and a
   `test/fixtures/rules/<name>/{valid,invalid}.bpmn` pair (the SVGs in the docs are rendered from
   them by `npm run docs:examples`). Cover both sides: every exclusion the rule makes (a shape it
   deliberately ignores, a case it deliberately allows) needs a valid case whose geometry would
   otherwise trip it — otherwise the exclusion is untested and the next refactor silently drops it.
   Add the pair to `test/rules/examples.spec.ts` so the docs picture stays honest.
3. **Docs page.** Add `docs/rules/<name>.md` explaining what the rule catches, why it matters, and
   the valid/invalid example pair.
4. **Wire it in.** Import the factory in `src/rules/miragon/index.ts` and add it to
   `miragonRuleFactories` — `resolverEntries` picks it up automatically, and the bundled resolver
   with it.
5. **Severity.** List it in `miragonAll` and `miragonRecommendedForAutomation` at `error`. In
   `miragonRecommendedForModeling` ship it `off`, unless it is a non-blocking layout hint safe on
   hand-drawn diagrams — those ship at `warn` (all in `src/rules/miragon/index.ts`). The modeling
   layer must never block a modeler on execution-only conventions; consumers opt in via
   `plugin:@miragon/rules/all`, the automation layer, or per rule.

### The bar for a new rule

- **Deterministic.** Decidable from the moddle tree or the DI coordinates. If it needs judgment,
  it is not a lint rule.
- **No false positives.** When in doubt, ship it as `warn`, or leave it out of the `recommended-for-*` layers.
- **Not already covered.** Check core bpmnlint and
  [`bpmnlint-plugin-camunda-compat`](https://github.com/camunda/bpmnlint-plugin-camunda-compat)
  first. Engine-compatibility rules are not this plugin's job.

## Ground rules

- **Conventional Commits.** Commit messages and PR titles follow
  [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`,
  `refactor:`, `test:`, `chore:`). Releases and the changelog are generated from them via
  [release-please](https://github.com/googleapis/release-please). For a lint preset "breaking" is
  not the same as for a library: adding a rule to a `recommended-for-*` layer or raising a severity turns a
  consumer's green build red, so it is a breaking change (`feat!:`); adding a rule only to `all`,
  or lowering a severity, is not.
- **Exact dependency versions.** No `^`, no `~`. `.npmrc` sets `save-exact=true` and CI verifies
  it — a floating transitive bump must never be able to change what the rules catch.

## Before opening a PR

```bash
npm run typecheck
npm run lint
npm run format:check
npm run knip
npm run lint:deps
npm test
npm run build
npm run test:distro
```

## The release flow

Releases are automated with release-please:

1. Merge PRs with Conventional-Commit titles into `main`.
2. release-please opens (and keeps updating) a release PR that bumps the version and the
   `CHANGELOG.md` from the accumulated commits.
3. Merging that release PR tags the release and triggers the publish job, which publishes to npm
   using OIDC trusted publishing (tokenless, with provenance). No manual `npm publish` and no
   `NPM_TOKEN` are involved.

## Reporting bugs

Use the GitHub issue templates. For a false positive or a missed defect, attaching the `.bpmn`
file is by far the fastest path to a fix — the rules are geometric, so the coordinates _are_ the
bug report.
