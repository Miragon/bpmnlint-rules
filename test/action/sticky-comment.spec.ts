import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(__dirname, '..', '..', 'action', 'sticky-comment.sh');

/**
 * A fake `gh` on the PATH: serves the comment pages from a file and logs every write, so the
 * script's upsert decisions can be checked without GitHub.
 */
const FAKE_GH = `#!/usr/bin/env bash
set -euo pipefail
if [ "$2" = "user" ]; then
  [ -n "\${FAKE_LOGIN:-}" ] && { echo "$FAKE_LOGIN"; exit 0; }
  echo "Resource not accessible by integration" >&2; exit 1
fi
if [ "$2" = "--paginate" ]; then cat "$FAKE_DIR/pages.json"; exit 0; fi
if [ "$2" = "--method" ]; then
  input="\${@: -1}"
  printf '%s %s %s\\n' "$3" "$4" "$(jq -c . "$input")" >> "$FAKE_DIR/writes.log"
  exit 0
fi
echo "unexpected gh call: $*" >&2; exit 1
`;

const MARKER = '<!-- miragon-bpmnlint:. -->';

let fakeDir: string;

beforeEach(() => {
  fakeDir = mkdtempSync(path.join(os.tmpdir(), 'fake-gh-'));
  writeFileSync(path.join(fakeDir, 'gh'), FAKE_GH);
  chmodSync(path.join(fakeDir, 'gh'), 0o755);
  writeFileSync(path.join(fakeDir, 'report.md'), '### 🔴 BPMN lint: 1 error\n');
});

afterEach(() => {
  rmSync(fakeDir, { recursive: true, force: true });
});

function runScript(pages: unknown[][], findingCount: number, login?: string): string[] {
  writeFileSync(
    path.join(fakeDir, 'pages.json'),
    pages.map((page) => JSON.stringify(page)).join('\n'),
  );
  execFileSync('bash', [SCRIPT], {
    env: {
      ...process.env,
      PATH: `${fakeDir}:${process.env.PATH}`,
      FAKE_DIR: fakeDir,
      ...(login ? { FAKE_LOGIN: login } : {}),
      REPO: 'acme/models',
      PR: '7',
      MARKDOWN: path.join(fakeDir, 'report.md'),
      FINDING_COUNT: String(findingCount),
    },
    stdio: 'pipe',
  });
  const log = path.join(fakeDir, 'writes.log');
  return existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [];
}

const comment = (id: number, login: string, body: string) => ({
  id,
  user: { login, type: login.endsWith('[bot]') ? 'Bot' : 'User' },
  body,
});
const expectedBody = JSON.stringify({ body: `${MARKER}\n### 🔴 BPMN lint: 1 error\n` });

describe('action/sticky-comment.sh', () => {
  it("updates the bot's earlier comment, found on any page", () => {
    const pages = [
      [comment(1, 'someone', 'LGTM')],
      [comment(2, 'github-actions[bot]', `${MARKER}\nold report`)],
    ];

    expect(runScript(pages, 1)).toEqual([
      `PATCH repos/acme/models/issues/comments/2 ${expectedBody}`,
    ]);
  });

  it('never edits a comment someone else wrote with the marker, and posts its own', () => {
    const pages = [[comment(3, 'someone', `${MARKER}\nfake report`)]];

    expect(runScript(pages, 1)).toEqual([
      `POST repos/acme/models/issues/7/comments ${expectedBody}`,
    ]);
  });

  it("finds a GitHub App's comment, whose token cannot read its own login", () => {
    const pages = [[comment(6, 'acme-ci[bot]', `${MARKER}\nold report`)]];

    expect(runScript(pages, 1)).toEqual([
      `PATCH repos/acme/models/issues/comments/6 ${expectedBody}`,
    ]);
  });

  it("finds the comment of a personal access token's user", () => {
    const pages = [[comment(4, 'release-bot', `${MARKER}\nold report`)]];

    expect(runScript(pages, 1, 'release-bot')).toEqual([
      `PATCH repos/acme/models/issues/comments/4 ${expectedBody}`,
    ]);
  });

  it('posts nothing for a clean run without an earlier comment', () => {
    expect(runScript([[]], 0)).toEqual([]);
  });

  it('still updates an earlier comment when the run is clean, so it does not go stale', () => {
    const pages = [[comment(5, 'github-actions[bot]', `${MARKER}\nold report`)]];

    expect(runScript(pages, 0)).toEqual([
      `PATCH repos/acme/models/issues/comments/5 ${expectedBody}`,
    ]);
  });
});
