#!/usr/bin/env bash
#
# Merge a PR only after CI is green.
#
#   ./scripts/merge-pr.sh 42
#
# GitHub branch protection would enforce this server-side, but it requires
# GitHub Pro on a private repository. Until then this is the guard: `gh pr
# merge` on its own will happily merge a PR whose checks are still queued, and
# has done so twice on this repo.
#
set -euo pipefail

PR="${1:-}"
[[ -n "$PR" ]] || { echo "usage: $0 <pr-number>" >&2; exit 1; }

echo "==> waiting for checks on #${PR}"
# --watch blocks until every check finishes; --fail-fast stops at the first
# failure rather than waiting for the rest to time out.
if ! gh pr checks "$PR" --watch --fail-fast; then
    echo "xx checks did not pass — not merging" >&2
    exit 1
fi

echo "==> checks are green, merging"
gh pr merge "$PR" --squash --delete-branch

echo "==> updating local main"
git checkout main
git pull --ff-only origin main
git fetch --prune origin
git log --oneline -1
