---
description: Review the open PR, then merge it and clean up the branch
argument-hint: [PR number — omit to use the current branch's PR]
---

Close out the work in **$ARGUMENTS** (or the current branch's PR if empty).

This command has a human gate in the middle. Do the review prep automatically,
then **stop and wait** for the user. Never merge without their explicit go-ahead.

## 1. Find the PR

```bash
gh pr view $ARGUMENTS --json number,title,url,state,headRefName,baseRefName,mergeable,body
```

With no argument, `gh pr view` resolves the current branch's PR. If there is no
PR, say so and suggest `/start-work`. If the PR is already merged or closed, say
so and skip to step 5 to clean up any leftover branch.

## 2. Verify the gates yourself

Do not trust the PR body. Check out the branch and run all three:

```bash
git checkout <headRefName>
cd frontend && npm test && npm run build && npm run lint && cd ..
cd backend  && .venv/bin/pytest && cd ..
```

Report the real numbers. If any gate fails, **stop** — report the failure and do
not offer to merge. Offer to fix it instead.

## 3. Review the diff

```bash
gh pr diff $ARGUMENTS
```

Read it properly and report:

- **What actually changed**, file by file, in plain terms
- **Anything that contradicts `CLAUDE.md`** — a reformatted class string in
  `src/components/ui/`, a backend call outside `src/lib/adapters/`, a stub made
  to return a fake success, a `cc_*` write with no change event dispatched
- **Anything risky or surprising** — silently swallowed errors, a weakened or
  deleted test, a new dependency, a change to behaviour the user did not ask for
- **What you would want a human to look at**, ranked

Be honest. If the change is fine, say so plainly rather than inventing concerns.
If something is wrong, say that plainly too — this is the last gate.

## 4. Hand it to the user — STOP HERE

Present the summary and ask whether to merge. Wait for a real answer.

If they ask for changes, make them on the branch, re-run the gates, push, and
return to step 3.

## 5. Merge and clean up — only after approval

```bash
gh pr merge <number> --squash --delete-branch
git checkout master
git pull --ff-only origin master
git branch -d <headRefName>        # plain -d; never force-delete
```

Use `--squash` unless the branch's individual commits are worth keeping in
history, in which case use `--merge` and say why.

If `git branch -d` refuses because the branch looks unmerged, do NOT reach for
`-D`. Investigate and report — that usually means the squash-merge left the
local branch's commits unreachable, which is expected after a squash, or that
something genuinely did not land.

## 6. Confirm

Report:

- The merge commit on `master`
- That local and remote branches are gone
- The gate results on `master` after the merge — re-run both suites to be sure the
  merged result is green, not just the branch
- What is now worth doing next, if anything obvious came out of the review
