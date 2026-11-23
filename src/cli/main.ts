#!/usr/bin/env node
/**
 * The `miragon-bpmnlint` bin: runs one {@link LintCommand} against the real process.
 * `process.exitCode` instead of `process.exit()`, so piped output is flushed before Node exits.
 */
import { LintCommand } from './LintCommand';

void new LintCommand({
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  stdout: process.stdout,
  stderr: process.stderr,
})
  .run()
  .then((exitCode) => {
    process.exitCode = exitCode;
  });
