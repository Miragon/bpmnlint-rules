# GitHub Action

Check the BPMN models of every pull request, see the findings as one comment on it, and block the merge on errors.

**Requirements:** a GitHub repository with GitHub Actions. Nothing needs to be installed.

## 1. Add the workflow

Save this as `.github/workflows/bpmnlint.yml`:

<!-- x-release-please-start-version -->

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
      - uses: Miragon/bpmnlint-rules@v0.25.0
```

<!-- x-release-please-end -->

It lints with your `.bpmnlintrc`. Without one, the `recommended-for-automation` preset applies, so start with [Getting started](../guide.md) to pick your rules.

## 2. Open a pull request

On every pull request the Action:

- Lints the `.bpmn` files the pull request adds or changes.
- Writes a table of the findings to the job summary and as **one** comment on the pull request. Each later push updates that comment. A run without findings posts nothing, but it marks an earlier comment as clean.
- Annotates each finding at the element's line in the changed file.
- Fails the job on an `error` finding. A `warn` finding never fails it.

On any other event, such as a push to `main`, it lints all matching models and skips the comment.

## Inputs

| Input               | Default                                | What it does                                                                                                  |
| ------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `files`             | `**/*.bpmn`                            | Globs of the models to lint, one per line, relative to `working-directory`. `node_modules` is always skipped. |
| `config`            | `.bpmnlintrc`                          | The bpmnlint config file. Without one, the `recommended-for-automation` preset applies.                       |
| `preset`            |                                        | `recommended-for-modeling`, `recommended-for-automation` or `strict` instead of a config file.                |
| `changed-only`      | `true`                                 | On a pull request, lint only the models it changes (needs `pull-requests: read`). `false` lints every match.  |
| `comment`           | `true`                                 | Post and update the pull request comment.                                                                     |
| `working-directory` | `.`                                    | Where the `.bpmnlintrc` is. Several calls with different directories each keep their own comment.             |
| `github-token`      | <code v-pre>${{ github.token }}</code> | Reads the pull request's files and writes the comment.                                                        |

The outputs `error-count` and `warning-count` hold the numbers of findings.

## Good to know

- Configs work without an install. The Action carries every rule and config of this package: `bpmnlint:recommended`, `plugin:@miragon/rules/*`, `plugin:camunda-compat/*` and the Camunda moddle extensions. If you run `npm ci` before the Action, the bpmnlint plugins installed in your project are used instead, at the versions you pinned.
- Pin a release: use a release tag such as `@v0.25.0` <!-- x-release-please-version -->, or its commit SHA. There is no moving `v0` tag, and every release can make `strict` stricter.
- Pull requests from forks get a read-only token. The comment is skipped with a warning; the job summary and the annotations still show every finding. Do not switch to `pull_request_target` to work around this: it would lint the fork's config and models with a write token.
- A comment holds at most 65,536 characters. When the findings do not fit, the comment leaves out the last files and says how many findings are missing. GitHub also shows only the first 10 error annotations of a step. The job log has the full list either way.
- Self-hosted runners need `bash`, `git`, `jq`, the GitHub CLI `gh` and access to the npm registry; GitHub-hosted runners have all of them. The Action uses the runner's Node.js 22 or later. When it is missing or older, the Action installs Node.js 22, and the later steps of the job run on it too.
- Each call keeps one comment per `working-directory`. Two calls in the same directory, say with different `files`, share one comment and the later run overwrites it.
- Linting a config runs the bpmnlint plugins it extends, as `npx bpmnlint` does. Only `.json` moddle descriptors are read, never scripts.

## Next steps

- [Presets](../presets.md): which rules block the merge and which only warn.
- [CLI](./cli.md): the same check in GitLab, Jenkins or your terminal.
- [AI visual review](./ci.md): add an AI review of the rendered diagrams to the pull request.
