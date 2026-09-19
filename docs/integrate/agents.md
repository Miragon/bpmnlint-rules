# Coding agents

Agents write machine ids, orphan nodes and engine-invalid constructs into models that still parse.
The fix is the same one a human gets: run the linter and read the findings. A coding agent can do
that itself, it only has to be told when.

<AgentLoop />

Once the plugin is [set up](../guide.md), `npx bpmnlint` is all an agent needs. Pick the option your
harness supports. They combine well: instructions for the habit, a hook for the guarantee, CI as the
backstop.

## Tell the agent in its instructions

Works with every harness that reads a project instruction file: `AGENTS.md`, `CLAUDE.md`,
`.cursor/rules`, `.github/copilot-instructions.md`.

```md
## BPMN

After creating or changing a `.bpmn` file, run `npx bpmnlint <file>`.
Fix every reported error before you finish. Treat warnings as review
comments: fix them unless there is a reason not to, and say why.
Never silence a rule in `.bpmnlintrc` to get a clean run.
```

This relies on the agent following the instruction. It usually does, and nothing enforces it.

## Enforce it with a hook

A hook runs the linter for the agent, every time, and hands the findings straight back. In Claude
Code that is a `PostToolUse` hook on file edits:

```json
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/lint-bpmn.sh"
          }
        ]
      }
    ]
  }
}
```

```bash
#!/usr/bin/env bash
# .claude/hooks/lint-bpmn.sh
file=$(jq -r '.tool_input.file_path // empty')
[[ "$file" == *.bpmn ]] || exit 0

npx bpmnlint "$file" >&2 || exit 2
```

Exit code `2` tells Claude Code to show the linter output to the agent, which then fixes the model
and triggers the hook again. Other harnesses with post-edit hooks work the same way: lint the
changed file, return the findings on failure.

## Keep CI as the backstop

Whatever happens in the session, the [merge gate](./api.md#in-ci) lints every model again. An agent
that skipped the instruction still cannot ship a broken model.

## Which findings block

`npx bpmnlint` exits non-zero only on `error` findings. With the recommended presets the Miragon
naming and layout findings are `warn`: the agent sees them, the hook does not block on them. To make
them blocking for agents, extend `plugin:@miragon/rules/all` in the config the agent lints with. See
[Presets](../presets.md).

## Building your own agent

No coding harness, but your own pipeline that generates BPMN from a model call? Use the
[programmatic API](./api.md#programmatic-api) and feed the errors back as the next prompt.
`generateModel` stands for your model call.

```ts
import BpmnModdle from 'bpmn-moddle';
import Linter from 'bpmnlint/lib/linter';
import {
  createBundledResolver,
  getDefaultLintConfig,
} from '@miragon/bpmnlint-plugin-rules';

const config = getDefaultLintConfig({ engine: 'c8' });
const moddle = new BpmnModdle(config.moddleExtensions);
const linter = new Linter({
  config,
  resolver: createBundledResolver(),
});

async function errorsIn(xml: string) {
  const { rootElement } = await moddle.fromXML(xml);
  const results = await linter.lint(rootElement);
  return Object.entries(results).flatMap(([rule, findings]) =>
    findings
      .filter((finding) => finding.category === 'error')
      .map(
        (finding) => `${rule} on <${finding.id}>: ${finding.message}`,
      ),
  );
}

let xml = await generateModel(task);
for (let attempt = 0; attempt < 3; attempt++) {
  const errors = await errorsIn(xml);
  if (errors.length === 0) break;
  xml = await generateModel(
    `${task}\n\nFix these lint errors:\n${errors.join('\n')}`,
  );
}
```
