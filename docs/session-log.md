# Session log

One entry per session, newest first, written when the owner says **"wrap up"**.

This is not a changelog — git already has one. It records what was *learned*:
the bugs that cost real time, the assumptions that turned out wrong, and the
guards added so the same mistake cannot be made twice. A future session should
be able to read the top two entries and avoid a day of rediscovery.

**Keep an entry short.** Three or four lessons that changed how the work is
done, not a list of everything that happened.

---

## 2026-08-21 — First deployment, PostgreSQL, Google sign-in, Stripe

Bare accounts to a live app taking payments. The app is at
<https://crayoncookout.com>, on an Oracle VM behind a Cloudflare Tunnel, with
Stripe in **live mode**.

### What was learned

**Test the request the app actually makes, not one you construct.** The Google
sign-in endpoint required an `Origin` header. Browsers do not send `Origin` on
same-origin GETs, so it returned 422 for every real user — while `curl -H
"Origin: ..."` returned 200. The curl proved the validation worked; it did not
prove the feature did. *Guard: the endpoint tests now send no `Origin` header,
because that is what a browser sends.*

**Never build production images from Git Bash.** MSYS rewrites leading-slash
arguments into Windows paths, so `--build-arg VITE_API_BASE_URL=/api` baked
`C:/Program Files/Git/api` into the bundle and **every** API call broke. It
presented as "Could not reach the server". *Guard: build from PowerShell and
`grep -c 'Program Files'` the built asset before shipping — expect 0.*

**Verify by loading the page.** Twice a change was declared deployed on the
strength of `curl /api/health` or a bundle hash, while the page itself was
broken or ugly. Screenshot the actual page. *Guard: a Playwright check against
the live URL after every frontend deploy.*

**A mock can encode your assumption instead of reality.** The Stripe webhook
tests passed against dicts; `stripe-python` returns a `Session` object whose
`.get()` raises. Every refusal path was faithfully tested while the one success
path could never have worked. *Guard: the regression test uses a stand-in that
raises on `.get()`, exactly as the real object does.*

**The file that runs production must be the file under review.** The VM's
`docker-compose.yml` was hand-maintained and silently diverged from the repo's,
so three Stripe variables never reached the container and a real payment failed
with a 503 that looked like a code bug. *Guard:
`deploy/docker-compose.prod.yml` is in git, pushed by
`scripts/push-compose.sh`, and `tests/test_compose_parity.py` fails when the two
disagree.*

**`gh pr merge` merges a PR whose checks are still queued.** It did, twice.
Branch protection would prevent it server-side but needs GitHub Pro on a private
repo. *Guard: `scripts/merge-pr.sh` waits on `gh pr checks --watch`.*

**A 200 can hide a missing file.** `serve -s` returns `index.html` for any
unmatched path, so a missing favicon and manifest were served as HTML with a
200 for weeks. Check `content-type`, not just the status.

**Favicons are cached far harder than other assets** — a normal reload does not
refetch them. Before debugging a favicon, hard-reload. To ship a *new* mark to
returning visitors, version the URL (`?v=2`); changing the file is not enough.

### Decisions worth remembering

- **The webhook is the only thing that may grant an entitlement over HTTP.**
  Comps go through `python -m app.admin grant` on the server, or a 100%-off
  Stripe promotion code. An "admin can buy free" flag would be a second granting
  path, and a bug in its guard makes every paid feature free.
- **A comp is recorded as `source='grant'`** with no Stripe reference, so
  giveaways never quietly count as revenue.
- **The logo and the favicon are two marks, not one.** The favicon carries a
  tile and five crayons so it survives 16px; the logo is seven crayons and no
  tile because it sits on a page that already has a background. Merging them was
  tried and reverted.
- **Two Claude sessions in one repo cost time twice** — a worktree holding
  `main` broke `git checkout main`, and a branch was cut from the wrong base as
  a result. Prefer one session per repo.
