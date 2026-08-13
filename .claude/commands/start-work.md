---
description: Branch, implement a change, verify, and open a PR
argument-hint: [what to build or fix — omit to find work]
---

Run the full start-to-PR workflow for: **$ARGUMENTS**

Work autonomously. Do not stop to ask "shall I continue?" between steps. Only
stop for the two cases in "When to stop" below.

## 1. Decide what to work on

If `$ARGUMENTS` describes a task, that is the work. Read enough of the codebase
to scope it, then go.

If `$ARGUMENTS` is empty, find the work yourself and pick ONE item. Look at, in
order of priority:

1. Failing gates — `npm test`, `npm run build`, `npm run lint`
2. Open GitHub issues — `gh issue list --limit 20`
3. Known gaps recorded in `CLAUDE.md` — the `AdBar.jsx` and `ColouringLab.jsx`
   placeholders, and the stubbed `auth` / `vision` / `consent` adapters
4. `TODO` / `FIXME` comments in `src/`

Say in one line which item you picked and why. Prefer the smallest change that
delivers something real over a sprawling refactor.

## 2. Prepare the branch

```bash
git status --short          # must be clean — if not, STOP and report
git checkout master
git pull --ff-only origin master
git checkout -b <type>/<short-kebab-description>
```

Use `feat/`, `fix/`, `chore/`, `test/` or `docs/` as the type. Never work
directly on `master`.

## 3. Implement

Follow `CLAUDE.md` — it is binding, especially:

- `src/lib/adapters/` is the only place that talks to a backend
- class strings in `src/components/ui/` are byte-locked; do not reformat them
- writes to the `cc_*` localStorage keys must dispatch their change event
- never make a stub return a fake success value

Write the test first where a test makes sense, watch it fail, then implement.
If you touch UI, keep the rendered output identical unless the task is
explicitly a visual change.

## 4. Verify — all three must pass

```bash
cd frontend && npm test && npm run build && npm run lint
cd backend  && .venv/bin/pytest      # or .venv/Scripts/python.exe -m pytest on Windows
```

If the change touches infrastructure, also validate it:
`docker compose config --quiet` and `bash -n scripts/*.sh`.

Do not proceed with a failing gate. Fix the cause; never weaken a test or add an
eslint-disable to make a gate go green. If `no-linkage.test.js` fails because
the work deliberately reintroduces a dependency, update that test in the same
commit and explain the choice in the commit message.

## 5. Commit and push

One focused commit, or a few if the work has genuinely separable parts. Write
messages that say why, not just what.

```bash
git push -u origin <branch>
```

## 6. Open the PR

```bash
gh pr create --title "<concise title>" --body "<body>"
```

The body must cover:

- **What changed** and why
- **Verification** — the real numbers from step 4 (test count, build result, lint
  exit code)
- **Risk / what to look at** — the parts most worth a human eye
- **Anything deliberately left out**, and why

End the body with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## 7. Report

Give the PR URL, the one-line summary of the change, and the three gate results.
Then tell the user to run `/complete-work` when they are ready to review.

## When to stop

Stop and ask only if:

- The working tree was dirty at step 2 — report what is uncommitted, change
  nothing
- The task turns out to need a product decision you cannot make from the code
  (which backend to use, what a feature should do). Then say what you found, lay
  out the options, and wait

Everything else, decide and proceed.
