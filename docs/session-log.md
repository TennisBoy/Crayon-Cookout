# Session log

One entry per session, newest first, written when the owner says **"wrap up"**.

This is not a changelog — git already has one. It records what was *learned*:
the bugs that cost real time, the assumptions that turned out wrong, and the
guards added so the same mistake cannot be made twice. A future session should
be able to read the top two entries and avoid a day of rediscovery.

**Keep an entry short.** Three or four lessons that changed how the work is
done, not a list of everything that happened.

---

## 2026-08-28 — White favicon tile, and the deploy docs that described a fiction

A one-line visual change. The change itself took a minute; establishing how to
ship it took the rest, because no document in the repo described the actual
deployment.

### What was learned

**The repo contradicted itself about the VM's architecture, and the majority
was wrong.** Four places said Oracle Ampere/arm64; `INFRASTRUCTURE.md` said
x86_64. The correction had been recorded once, in one file, and nothing made
the other four agree — so the wrong answer outnumbered the right one 4:1 and
read as consensus. This was harmless while images were built on the VM. It is
not now: an arm64 image `docker load`s onto this amd64 box without complaint
and only fails at start. *Guard: all five corrected, and each now says to run
`uname -m` and believe it rather than trust the shape you meant to create. When
a fact lives in N documents, fixing one of them is not fixing it.*

**No documented deploy process matched reality, and both wrong versions were
plausible.** `docs/deployment.md` said images are built on the VM from source;
`INFRASTRUCTURE.md` said they are built in CI and pulled from ghcr by tag.
There is no checkout on the VM, and CI publishes nothing — it builds images
only to prove the Dockerfiles work, which is exactly what made the ghcr story
believable. The VM was the only honest source. *Guard: `deployment.md` now
describes the real path — build on a workstation, `docker save`, `scp`,
`docker load`, retag in `.env`, `compose up -d`. Before a deploy, read the
machine, not the docs.*

**`networkidle` is not "the page rendered".** The post-deploy screenshot guard
from last session fired correctly and returned a picture of the loading
splash — the SPA shows one for three to five seconds while auth resolves, and
network activity goes quiet well before content appears. A careless read of
that screenshot would have passed a blank page as proof. *Guard: wait for real
text on the page, then screenshot; treat any screenshot whose body text is just
the app name as a splash, not a render.*

**The previous log entry paid for itself.** The instinct on "make the favicon
white" is to change the fill and ship. That would have reached nobody:
browsers cache favicons far harder than other assets, as recorded here last
session. The lesson was only useful because it was written down — memory would
not have produced it. *Guard: promoted from prose to a test.
`frontend/src/test/favicon.test.js` asserts the icon URL carries a version
query, resolves to a file that exists, and is identical in `index.html` and
`manifest.json`.*

### Decisions worth remembering

- **The white favicon tile has no outline and vanishes on light browser
  chrome.** On a light tab strip the mark reads as five loose crayons rather
  than an app icon. This was raised, considered and accepted — it is the point
  of the change, not an oversight. Do not "fix" it with a border without
  asking. The yellow crayon also loses contrast on white; the other four hold.
- **`theme-color` and `theme_color` stay brand purple.** They colour the
  browser and OS chrome *around* the app, not the icon, so they did not follow
  the favicon to white.
- **Rollback depends on old images still being on the VM.** There is no
  registry, so the recovery path is a tag change in `.env` plus
  `compose up -d`. A blanket `docker image prune -a` would delete it. Prune
  specific tags deliberately or not at all.
- **`scripts/deploy.sh` is a local-development tool.** It builds from a
  checkout using the root `docker-compose.yml`. It cannot deploy production and
  `SETUP.md` was wrong to point at it. Left in place; it is fine for local use.

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
