---
description: Close out a session — record what was learned and leave the repo tidy
---

# Wrap up

Run when the owner says **"wrap up"**. The point is not a summary — git has
that. It is to leave the next session better informed than this one started.

## 1. Leave the repo clean

```bash
git status --short          # must be empty
git branch -vv              # merged branches deleted
git worktree list           # no strays holding `main`
gh pr list --state open     # nothing forgotten
```

Merge or close anything outstanding, or say plainly what is being left open and
why.

## 2. Check the deployed state matches `main`

```bash
git log --oneline -1
ssh <vm> "cd ~/crayon && docker compose ps --format 'table {{.Service}}\t{{.Image}}'"
```

If production is behind `main`, say so — do not let it be discovered later.

## 3. Update `docs/SETUP.md`

The progress box is what a new session reads first. Make it true, including
steps finished today and anything that turned out to be wrong in the
walkthrough.

## 4. Add an entry to `docs/session-log.md`

Newest first. **Lessons, not activity.** For each one: what went wrong, why it
was not caught, and the guard that now prevents it. Three or four is plenty; a
list of everything that happened is worth nothing to the next session.

A lesson earns its place if a future session would otherwise repeat the mistake.
"Fixed the cart page" does not. "`gh pr merge` merges while checks are queued —
use `scripts/merge-pr.sh`" does.

Also record decisions that were argued about and settled, especially ones the
code cannot explain by itself.

## 5. Commit it properly

Never on `main`. Branch, PR, and merge with `./scripts/merge-pr.sh <number>`.

## 6. Report

- What shipped and what is deployed
- What is genuinely unfinished or untested, stated plainly
- The single next thing worth doing
