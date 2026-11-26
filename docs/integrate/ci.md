# CI quality gates

Lint every model a change touches and block the merge on errors. On GitHub, the Action does it in
a few lines and comments the findings on the pull request. Any other CI system runs the same
linter as the `miragon-bpmnlint` CLI.

## GitHub Action

```yaml
name: BPMN lint

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write # for the comment

concurrency:
  group: bpmnlint-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  bpmnlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: Miragon/bpmnlint-rules@v0.25.0 # x-release-please-version
```

What it does on a pull request:

- Lints the `.bpmn` files the pull request adds or changes.
- Writes a table of the findings to the job summary and as **one** comment on the pull request.
  Each later push updates that comment. A run without findings posts nothing, but it marks an
  earlier comment as clean.
- Annotates each finding at the element's line in the changed file.
- Fails the job on an `error` finding. A `warn` finding never fails it.

On any other event, such as a push to `main`, it lints all matching models and skips the comment.

### Inputs

| Input               | Default               | What it does                                                                                                  |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `files`             | `**/*.bpmn`           | Globs of the models to lint, one per line, relative to `working-directory`. `node_modules` is always skipped. |
| `config`            | `.bpmnlintrc`         | The bpmnlint config file. Without one, the `recommended-for-automation` preset applies.                       |
| `preset`            |                       | `recommended-for-modeling`, `recommended-for-automation` or `strict` instead of a config file.                |
| `changed-only`      | `true`                | On a pull request, lint only the models it changes (needs `pull-requests: read`). `false` lints every match.  |
| `comment`           | `true`                | Post and update the pull request comment.                                                                     |
| `working-directory` | `.`                   | Where the `.bpmnlintrc` is. Several calls with different directories each keep their own comment.             |
| `github-token`      | `${{ github.token }}` | Reads the pull request's files and writes the comment.                                                        |

The outputs `error-count` and `warning-count` hold the numbers of findings.

### Good to know

- Configs work without an install. The Action carries every rule and config of this package:
  `bpmnlint:recommended`, `plugin:@miragon/rules/*`, `plugin:camunda-compat/*` and the Camunda
  moddle extensions. If you run `npm ci` before the Action, the bpmnlint plugins installed in your
  project are used instead, at the versions you pinned.
- Pin a release: use a release tag such as `@v0.25.0` <!-- x-release-please-version -->, or its
  commit SHA. There is no moving `v0` tag, and every release can make `strict` stricter.
- Pull requests from forks get a read-only token. The comment is skipped with a warning; the
  job summary and the annotations still show every finding. Do not switch to `pull_request_target`
  to work around this: it would lint the fork's config and models with a write token.
- A comment holds at most 65,536 characters. When the findings do not fit, the comment
  leaves out the last files and says how many findings are missing. GitHub also shows only the
  first 10 error annotations of a step. The job log has the full list either way.
- The Action uses the runner's Node.js 22 or later. When it is missing or older, the Action
  installs Node.js 22, and the later steps of the job run on it too.
- Each call keeps one comment per `working-directory`. Two calls in the same directory, say with
  different `files`, share one comment and the later run overwrites it.
- Linting a config runs the bpmnlint plugins it extends, as `npx bpmnlint` does. Only `.json`
  moddle descriptors are read, never scripts.

## Other CI systems: the CLI

The Action is a thin layer over the `miragon-bpmnlint` CLI, which ships in this package. The CLI
knows nothing about GitHub, so any CI system can run it:

```bash
npx --package @miragon/bpmnlint-plugin-rules@0.25.0 miragon-bpmnlint 'processes/**/*.bpmn' # x-release-please-version
```

It reads the `.bpmnlintrc` in the working directory, or uses `--config <file>` or `--preset <name>`.
It exits with `0` when there are no errors, `1` when there is at least one `error` finding, and `2`
when the call or the config is wrong.

`--format` picks the output and can be repeated. `=<file>` writes that format to a file:

| Format     | For                                                                                  |
| ---------- | ------------------------------------------------------------------------------------ |
| `text`     | The console (default)                                                                |
| `json`     | Machines: `{ schemaVersion, errorCount, warningCount, files: [{ path, findings }] }` |
| `markdown` | A merge request comment or a job summary. `--max-length <chars>` caps it.            |
| `github`   | GitHub Actions annotations                                                           |

To lint only what a change touches, write the changed paths to a file, one per line, and pass it
as `--files-from <file>`. Only the files that also match the globs are linted. `--path-base <dir>`
prints paths relative to `<dir>`, for example the repository root.

A GitLab CI job that fails the pipeline on errors and keeps the reports:

```yaml
bpmnlint:
  image: node:22
  script:
    - npx --yes --package @miragon/bpmnlint-plugin-rules@0.25.0 miragon-bpmnlint --format text --format json=bpmnlint.json --format markdown=bpmnlint.md # x-release-please-version
  artifacts:
    when: always
    paths: [bpmnlint.json, bpmnlint.md]
```

## With an AI visual review

An example GitHub Actions workflow that adds an AI review of the rendered diagrams to the lint:
[`bpmn-quality-gates.yml`](https://github.com/Miragon/bpmnlint-rules/blob/main/docs/integrate/ci/bpmn-quality-gates.yml).
It is documentation only. Copy it into your own repo, because it does not run here.

### What the jobs do

1. **`lint-bpmn`** runs `npx bpmnlint` with your project's `.bpmnlintrc` on the models. This is the
   deterministic gate: a finding at `error` fails the check. The report becomes a job output.
2. **`visual-review`** is optional. The Claude Code CLI installs this repo's plugin and runs the
   `verify-model-visually` skill on the rendered models. It writes `verdict.json` (machine-readable)
   and `verdict.md` (the comment table). The job is skipped when lint fails or when no secret is set.
3. **`post-comment`** posts one sticky PR comment with both results. Later runs update it
   (`gh pr comment --edit-last`); if there is nothing to update, a new comment is created.

The workflow calls `claude -p` directly rather than `anthropics/claude-code-action`, because the
action skips itself on PRs that change its own workflow file.

### Set it up

1. Copy the file to `.github/workflows/bpmn-quality-gates.yml`.
2. Fill in the values marked `PLACEHOLDER`:
   - `BPMN_GLOB`: the models to check, as a bash globstar pattern, e.g. `processes/**/*.bpmn`.
   - `on.pull_request.paths`: the same pattern. GitHub cannot read `env` there.
   - `NODE_PROJECT_DIR`: the directory with the `package.json`, lockfile and `.bpmnlintrc`. That
     `package.json` must pin `bpmnlint` and `@miragon/bpmnlint-plugin-rules` (see
     [Getting started](../guide.md)).
3. Optional: add the visual review (next section).

Lint and the comment need no secret.

### The visual review

Add a `CLAUDE_CODE_OAUTH_TOKEN` repository secret (create one with `claude setup-token`). The
`visual-review` job runs only when this secret is set.

The AI verdict is **advisory** by default: findings show up in the comment and as warnings, but they
never fail the check. Set `FAIL_ON_HIGH_SEVERITY: 'true'` to change that. The default is advisory
because the review is non-deterministic. In a test, a faint overlap planted in a model was rated
high in only 1 of 4 runs. Hard geometry defects like overlaps, crossings and flows through shapes
are bpmnlint's job, and the [layout rules](../rules/layout.md) catch them the same way on every run.
Use the visual review for what a linter can't judge: readability, grouping, intent.
