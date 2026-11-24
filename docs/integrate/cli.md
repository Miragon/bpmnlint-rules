# CLI

Lint BPMN models in any CI system or in your terminal, and get the findings as text, JSON, markdown or annotations.

**Requirements:** Node.js 22 or later.

## 1. Run it

`miragon-bpmnlint` ships in the package. `npx` runs it without an install:

<!-- x-release-please-start-version -->

```bash
npx --package @miragon/bpmnlint-plugin-rules@0.25.0 miragon-bpmnlint 'processes/**/*.bpmn'
```

<!-- x-release-please-end -->

It lints with the `.bpmnlintrc` in the working directory, and prints one line per finding: element, line, severity, message and rule.

```txt
...
processes/order-fulfillment.bpmn
  flow_finalized:33  error  Sequence flow crosses <flow_orderRevised>  @miragon/rules/flow-crossing
  flow_orderRevised:35  error  Sequence flow crosses <flow_finalized>  @miragon/rules/flow-crossing

13 findings in 3 files (2 errors, 11 warnings, 0 infos).
```

The run exits with `0` when there are no errors, `1` when there is at least one `error` finding, and `2` when the call or the config is wrong. Warnings never fail it.

## 2. Pick the config

Without options the CLI uses the `.bpmnlintrc` in the working directory, or the `recommended-for-automation` preset when there is none. `--config <file>` names another config file, `--preset <name>` picks `recommended-for-modeling`, `recommended-for-automation` or `strict` instead. The rules and configs of this package are bundled, so nothing else needs to be installed; plugins your project installed are used at the versions you pinned.

## 3. Pick the output

`--format` picks the output and can be repeated. `=<file>` writes that format to a file:

| Format     | For                                                                                  |
| ---------- | ------------------------------------------------------------------------------------ |
| `text`     | The console (default)                                                                |
| `json`     | Machines: `{ schemaVersion, errorCount, warningCount, files: [{ path, findings }] }` |
| `markdown` | A merge request comment or a job summary. `--max-length <chars>` caps it.            |
| `github`   | GitHub Actions annotations                                                           |

## Lint only what changed

Write the changed paths to a file, one per line, and pass it as `--files-from <file>`. Only the files that also match the globs are linted. `--path-base <dir>` prints paths relative to `<dir>`, for example the repository root.

## GitLab CI

A job that fails the pipeline on errors and keeps the reports:

<!-- x-release-please-start-version -->

```yaml
bpmnlint:
  image: node:22
  script:
    - npx --yes --package @miragon/bpmnlint-plugin-rules@0.25.0 miragon-bpmnlint --format text --format json=bpmnlint.json --format markdown=bpmnlint.md
  artifacts:
    when: always
    paths: [bpmnlint.json, bpmnlint.md]
```

<!-- x-release-please-end -->

## Next steps

- [GitHub Action](./github-action.md): the same check with a comment on every pull request.
- [Presets](../presets.md): which rules fail the run and which only warn.
- [Coding agents](./agents.md): let an agent run the linter after every edit.
