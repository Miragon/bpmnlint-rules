# CI quality gates

An example GitHub Actions workflow that checks every pull request touching a BPMN model:
[`bpmn-quality-gates.yml`](https://github.com/Miragon/bpmnlint-rules/blob/main/docs/integrate/ci/bpmn-quality-gates.yml).
It is documentation only. Copy it into your own repo, because it does not run here.

## What the jobs do

1. **`lint-bpmn`** runs `npx bpmnlint` with your project's `.bpmnlintrc` on the models. This is the
   deterministic gate: a finding at `error` fails the check. The report becomes a job output.
2. **`visual-review`** is optional. The Claude Code CLI installs this repo's plugin and runs the
   `verify-model-visually` skill on the rendered models. It writes `verdict.json` (machine-readable)
   and `verdict.md` (the comment table). The job is skipped when lint fails or when no secret is set.
3. **`post-comment`** posts one sticky PR comment with both results. Later runs update it
   (`gh pr comment --edit-last`); if there is nothing to update, a new comment is created.

The workflow calls `claude -p` directly rather than `anthropics/claude-code-action`, because the
action skips itself on PRs that change its own workflow file.

## Set it up

1. Copy the file to `.github/workflows/bpmn-quality-gates.yml`.
2. Fill in the values marked `PLACEHOLDER`:
   - `BPMN_GLOB`: the models to check, as a bash globstar pattern, e.g. `processes/**/*.bpmn`.
   - `on.pull_request.paths`: the same pattern. GitHub cannot read `env` there.
   - `NODE_PROJECT_DIR`: the directory with the `package.json`, lockfile and `.bpmnlintrc`. That
     `package.json` must pin `bpmnlint` and `@miragon/bpmnlint-plugin-rules` (see
     [Getting started](../guide.md)).
3. Optional: add the visual review (next section).

Lint and the comment need no secret.

## The visual review

Add a `CLAUDE_CODE_OAUTH_TOKEN` repository secret (create one with `claude setup-token`). The
`visual-review` job runs only when this secret is set.

The AI verdict is **advisory** by default: findings show up in the comment and as warnings, but they
never fail the check. Set `FAIL_ON_HIGH_SEVERITY: 'true'` to change that. The default is advisory
because the review is non-deterministic. In a test, a faint overlap planted in a model was rated
high in only 1 of 4 runs. Hard geometry defects like overlaps, crossings and flows through shapes
are bpmnlint's job, and the [layout rules](../rules/layout.md) catch them the same way on every run.
Use the visual review for what a linter can't judge: readability, grouping, intent.
