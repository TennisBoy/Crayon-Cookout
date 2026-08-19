# Setup — ordered walkthrough

Bare accounts to a live app. Roughly an hour of work, most of it waiting.

**Keep the progress box below up to date as you go.** It is how a new session
knows where you are without asking you to re-explain.

---

## Where you are right now

_Last updated: 2026-08-19_

| Step | State |
|---|---|
| 1. Cloudflare domain | ✅ **Done** — `crayoncookout.com` is on Cloudflare |
| 2a. Supabase project | ✅ **Done** — project ref `jhwhkidhazzyztyuijhl` |
| 2b. Run `schema.sql` | ✅ **Done** — 2026-08-15, "Success. No rows returned" |
| 2c. Collect credentials | ⚠️ **Incomplete** — the key collected is the new `sb_secret_` format, which `supabase==2.11.0` rejects. Needs the **legacy `service_role` JWT**, plus the **session-pooler `DATABASE_URL`** |
| 2d. Supabase auth config | ✅ **Done** |
| 3. Oracle Cloud VM | ✅ **Done** — instance running, SSH reachable on port 22 |
| 4. VM prepared | ✅ **Done** — Docker 28.1.1, ufw, 4 GB swap |
| 5. Fill in `.env` | ⏳ **NEXT** — `DATABASE_URL` and the legacy JWT are both outstanding |
| 6. Deploy | ✅ **Done** — stack healthy, but needs a rebuild to pick up `psycopg` |
| 7. Cloudflare Tunnel | ⚠️ **Partial** — tunnel created, `config.yml` validates. DNS route and service install still pending |
| 8. End-to-end verification | ⬜ Not started |

### The VM layout changed

The deployment root is now **`/home/ubuntu/crayon`**, holding `docker-compose.yml`
and `.env` and no source checkout: images are built in CI and pulled by tag.
Steps 4–6 below still describe the original clone-and-build-on-the-VM flow,
which works and remains the fallback when a registry is unreachable. See
[`INFRASTRUCTURE.md`](../INFRASTRUCTURE.md) for what is actually deployed.

### ⚠️ Outstanding action, unverified

A **Postgres connection string containing the database password was pasted into
a chat session** on 2026-08-13. It must be rotated, and it is not confirmed that
it has been:

> Supabase dashboard → **Project Settings → Database → Reset database password**

**This is no longer free.** The backend now reaches `crayon_designs` and
`collectibles` over direct SQL, so the password is embedded in `DATABASE_URL`
in `.env` on the VM. Rotate it *first*, then copy the new connection string
into `.env` and `docker compose up -d`. Rotating without updating `.env` takes
the app's data layer down (auth keeps working — different credential).

### Decisions already made

- **Apex domain, no subdomain.** The app lives at `crayoncookout.com`, not
  `app.crayoncookout.com`. The tunnel routes `/api/*` to the backend and
  everything else to the SPA, so both are same-origin and CORS never applies.
- The photo scanner (`ANTHROPIC_API_KEY`) is deliberately **left until last**.
  It is optional; without it the scanner returns 503 and scans read as
  "didn't match".

### Never paste a secret into a chat

Every credential belongs in `.env` on the VM, typed by the owner. The
`service_role` key especially — it bypasses row-level security, so anyone
holding it can read and write every user's data. If a session needs to know
whether something is configured, it should ask for a command that prints a
boolean, not the value:

```bash
curl -s localhost:8000/api/health/ready   # {"capabilities":{"database":true,...}}
```

---

## 1. Cloudflare — add the domain ✅

Domain added, nameservers pointed at Cloudflare. Nothing further until step 7.

## 2. Supabase

### 2a. Create the project ✅

Done. Project ref `jhwhkidhazzyztyuijhl`, so:

```
SUPABASE_URL=https://jhwhkidhazzyztyuijhl.supabase.co
```

That URL is not a secret — it is baked into any Supabase client.

### 2b. Run the schema ✅

Ran 2026-08-15 — *"Success. No rows returned"*. Kept here because the file is
idempotent and re-running it is the fix for a schema that drifted.

The database is empty apart from Supabase's own auth tables. The app needs two
tables of its own.

1. Dashboard → **SQL Editor** → **New query**
2. Paste the whole of [`supabase/schema.sql`](../supabase/schema.sql)
3. **Run**

**Expected:** green *"Success. No rows returned"* — correct, since creating
tables returns no rows. Then **Table Editor** shows `crayon_designs` and
`collectibles`, both marked **RLS enabled**.

The file is idempotent. If unsure whether it ran, run it again.

**If it fails:** the likeliest cause is being in the wrong project. Check the
project switcher top-left.

### 2c. Collect the credentials ⚠️ INCOMPLETE

Both live in the Supabase dashboard:

| Where | `.env` variable | Sensitivity |
|---|---|---|
| **Connect → Session pooler** | `DATABASE_URL` | **Secret — embeds the DB password** |
| Settings → API → Project URL | `SUPABASE_URL` | Not secret |
| Settings → API → `service_role` | `SUPABASE_SERVICE_ROLE_KEY` | **Extremely secret** |
| Settings → API → `anon` public | `SUPABASE_ANON_KEY` | Not secret, currently unused |

Two credentials, not one: `DATABASE_URL` serves designs and collectibles over
SQL, the `service_role` key serves auth. Take the **session pooler** DSN, not
the direct `:5432` host — that one is IPv6-only and hangs from this VM. Take the
**legacy** `service_role` JWT (`eyJ…`); `supabase==2.11.0` rejects the newer
`sb_secret_…` format outright.

Write them straight into `.env` on the VM at step 5. Do not put them in a chat,
a commit, or any `VITE_*` variable — Vite inlines `VITE_*` into the public
bundle.

### 2d. Configure auth ✅

**Authentication → Providers → Email**:
- Enable email provider
- **Confirm email: ON** — the register page already implements the six-digit
  OTP step, so this matches the UI that exists

**Authentication → URL Configuration**:
- Site URL: `https://crayoncookout.com`
- Redirect URLs: add `https://crayoncookout.com/reset-password`

Without that redirect URL, password-reset emails refuse to link back.

> **Before real users:** Supabase's built-in SMTP is heavily rate-limited and
> for testing only. Registration will work for you and then quietly stop for
> everyone else. Configure your own SMTP under **Settings → Auth → SMTP**.

## 3. Oracle Cloud — create the VM ✅

**Start the signup early.** Free-tier ARM (Ampere) capacity is genuinely
scarce — "Out of host capacity" on instance creation is common and can need
retries over hours or days. Account verification needs a card and can lag.
This is the step most likely to stall everything else.

- Ubuntu 22.04+
- Ampere/arm64 free tier is the target; amd64 works unchanged
- Save the SSH key, note the public IP
- **Keep the default SSH rule** (TCP 22 from `0.0.0.0/0`) — you need it for
  step 4, and the default security list already has it.
- **Do not open 80 or 443**, or any other inbound port. The tunnel dials
  outbound; the app itself needs nothing reachable from the internet.
- The subnet must be **public**, and its route table needs `0.0.0.0/0` → an
  **Internet Gateway**. A VCN built by hand instead of with the "VCN with
  Internet Connectivity" wizard has neither, which yields an instance with a
  public IP that routes nowhere.

## 4. Prepare the VM ✅

```bash
ssh ubuntu@<vm-ip>
git clone https://github.com/TennisBoy/Crayon-Cookout.git
cd Crayon-Cookout
sudo ./scripts/setup-vm.sh
```

OS patches, Docker, firewall (deny inbound except SSH), swap on low-memory
instances, and it creates `.env` from the template.

## 5. Fill in `.env` ⏳ START HERE

```bash
nano .env
```

Minimum for a working app:

```
DATABASE_URL=<session-pooler DSN from Supabase → Connect>
SUPABASE_URL=https://jhwhkidhazzyztyuijhl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<the legacy service_role JWT from 2c>
CORS_ORIGINS=https://crayoncookout.com
```

Both credentials are needed and they cover different things: `DATABASE_URL`
serves designs and collectibles over SQL, the `service_role` key serves auth.
`/api/health/ready` reports them separately.

Two traps, both of which look like something else:

- Take the **session pooler** DSN from the dashboard's **Connect** dialog, not
  the direct `:5432` host. The direct host is IPv6-only on newer projects and
  hangs rather than erroring from an IPv4 VM.
- The `service_role` key must be the **legacy JWT** (starts `eyJ`). The newer
  `sb_secret_…` format is rejected by `supabase==2.11.0` before it makes any
  request, so it presents as a client bug rather than a bad key.

`VITE_API_BASE_URL` stays at its default `/api` — same-origin, which is what
the apex-domain routing expects.

## 6. Deploy ✅

```bash
./scripts/deploy.sh
curl -s localhost:8000/api/health/ready
```

Want `"database": true`. That proves the keys are *present*, not yet that they
are *correct* — step 8 proves that.

`deploy.sh` will not report success unless every container reports healthy, and
prints the rollback command if it fails.

## 7. Cloudflare Tunnel ⚠️ PARTIAL

```bash
curl -fsSLo cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb
cloudflared tunnel login
cloudflared tunnel create crayon-cookout
```

`~/.cloudflared/config.yml` — **the `/api` rule must come first**, or the
catch-all swallows it:

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: /home/ubuntu/.cloudflared/<TUNNEL-UUID>.json

ingress:
  - hostname: crayoncookout.com
    path: ^/api(/.*)?$
    service: http://localhost:8000

  - hostname: crayoncookout.com
    service: http://localhost:3000

  - service: http_status:404
```

```bash
cloudflared tunnel route dns crayon-cookout crayoncookout.com
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Full detail and troubleshooting: [cloudflare-tunnel.md](cloudflare-tunnel.md).

## 8. Verify end to end ⬜ NOT STARTED

```bash
curl -s https://crayoncookout.com/api/health
```

Then in a browser, the sequence that actually proves it works:

1. Register an account → receive the OTP email → enter the code
2. Log in
3. Kitchen → build a crayon → save it
4. Library → confirm it appears
5. Reload → confirm it persisted

Everything before this only proves the plumbing is connected. **This is the
first time the schema, the RLS policies and the auth flow are exercised
together, and it is where problems are most likely to surface.**

---

## Known traps

- **`VITE_API_BASE_URL` is baked in at build time.** Changing it needs
  `docker compose build frontend`; a restart will not pick it up.
- **Supabase built-in SMTP is rate-limited.** Fine for you, not for users.
- **Oracle ARM capacity.** See step 3.
- **The VM never answers `ping`.** OCI's default security list permits ICMP
  types 3/4 only, not echo. A timed-out ping says nothing about the instance's
  health — test reachability with a TCP probe to port 22 instead
  (`Test-NetConnection <ip> -Port 22`). Check the public IP on the instance page
  before concluding anything is broken; an ephemeral IP changes across a
  stop/start, and one wrong digit looks exactly like a firewall problem.
- **The `/api` ingress rule must precede the catch-all.** Otherwise every API
  call returns the SPA's HTML.

## If something breaks

| Symptom | Look at |
|---|---|
| `"database": false` | Keys missing/typoed in `.env`; `docker compose restart backend` |
| Everything returns 503 | Same — `docker compose logs backend \| head` warns at startup |
| `relation "crayon_designs" does not exist` | Step 2b never ran, or ran in a different project |
| `/api/...` returns HTML | Ingress rules in the wrong order (step 7) |
| 502 from Cloudflare | Tunnel is up, container is not — `docker compose ps` |
| Deep links 404 on refresh | Frontend container not doing SPA fallback (`serve -s`) |
| Build killed with no message | Out of memory — check `dmesg \| tail`; setup-vm.sh adds swap |
