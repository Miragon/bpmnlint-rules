#!/usr/bin/env bash
# Keeps one pull request comment with the lint report: updates the comment an earlier run posted,
# or posts a new one when there are findings. A clean run with no earlier comment posts nothing.
#
# The comment is found by a hidden marker (one per working directory, so action calls for
# different directories in one pull request do not overwrite each other) and by its author, so a
# person's comment that copies the marker is never edited.
#
# Env: GH_TOKEN, REPO (owner/name), PR (number), MARKDOWN (report file), FINDING_COUNT,
#      COMMENT_KEY (optional, default ".").
set -euo pipefail

marker="<!-- miragon-bpmnlint:${COMMENT_KEY:-.} -->"

# A personal access token can read its own login, so its comment is the one with that author. The
# default GITHUB_TOKEN and GitHub App tokens cannot; they comment as a bot (github-actions[bot],
# <app>[bot]), so any bot comment with the marker is the one.
if ! login=$(gh api user --jq '.login' 2> /dev/null); then
  login=''
fi

# --paginate prints one JSON array per page; --slurp joins them.
existing=$(
  gh api --paginate "repos/$REPO/issues/$PR/comments?per_page=100" \
    | jq -rs --arg login "$login" --arg marker "$marker" '
        [.[][]
          | select(.body | startswith($marker))
          | select(if $login == "" then .user.type == "Bot" else .user.login == $login end)
          | .id]
        | first // empty'
)

body=$(mktemp)
jq -n --arg marker "$marker" --rawfile report "$MARKDOWN" '{ body: ($marker + "\n" + $report) }' > "$body"

if [ -n "$existing" ]; then
  gh api --method PATCH "repos/$REPO/issues/comments/$existing" --input "$body" > /dev/null
  echo "Updated pull request comment $existing."
elif [ "${FINDING_COUNT:-0}" -gt 0 ]; then
  gh api --method POST "repos/$REPO/issues/$PR/comments" --input "$body" > /dev/null
  echo "Posted a pull request comment."
else
  echo "No findings and no earlier comment: nothing to post."
fi
