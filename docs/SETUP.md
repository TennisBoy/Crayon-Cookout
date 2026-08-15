# Setup — ordered walkthrough

Bare accounts to a live app. Roughly an hour of work, most of it waiting.

**Keep the progress box below up to date as you go.** It is how a new session
knows where you are without asking you to re-explain.

---

## Where you are right now

_Last updated: 2026-08-14_

| Step | State |
|---|---|
| 1. Cloudflare domain | ✅ **Done** — `crayoncookout.com` is on Cloudflare |
| 2a. Supabase project | ✅ **Done** — project ref `jhwhkidhazzyztyuijhl` |
| 2b. Run `schema.sql` | ⏳ **NEXT — start here** |
| 2c. Collect keys | ⬜ Not started |
| 2d. Supabase auth config | ⬜ Not started |
| 3. Oracle Cloud VM | ⬜ **No account yet** — start the signup early, see note |
| 4. VM setup script | ⬜ Not started |
| 5. Fill in `.env` | ⬜ Not started |
| 6. Deploy | ⬜ Not started |
| 7. Cloudflare Tunnel | ⬜ Not started |
| 8. End-to-end verification | ⬜ Not started |

### ⚠️ Outstanding action, unverified

A **Postgres connection string containing the database password was pasted into
a chat session** on 2026-08-13. It must be rotated, and it is not confirmed that
it has been:

> Supabase dashboard → **Project Settings → Database → Reset database password**

Nothing in this project uses that password — the backend authenticates with an
API key — so rotating it breaks nothing.

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

### 2b. Run the schema ⏳ START HERE

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

### 2c. Collect the keys ⬜

**Project Settings → API**:

| Dashboard label | `.env` variable | Sensitivity |
|---|---|---|
| Project URL | `SUPABASE_URL` | Not secret |
| `service_role` secret | `SUPABASE_SERVICE_ROLE_KEY` | **Extremely secret** |
| `anon` public | `SUPABASE_ANON_KEY` | Not secret, currently unused |

Write them straight into `.env` on the VM at step 5. Do not put them in a chat,
a commit, or any `VITE_*` variable — Vite inlines `VITE_*` into the public
bundle.

### 2d. Configure auth ⬜

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

## 3. Oracle Cloud — create the VM ⬜

**Start the signup early.** Free-tier ARM (Ampere) capacity is genuinely
scarce — "Out of host capacity" on instance creation is common and can need
retries over hours or days. Account verification needs a card and can lag.
This is the step most likely to stall everything else.

- Ubuntu 22.04+
- Ampere/arm64 free tier is the target; amd64 works unchanged
- Save the SSH key, note the public IP
- **Do not open any inbound port** in the VCN security list. The tunnel dials
  outbound; nothing needs to be reachable from the internet.

## 4. Prepare the VM ⬜

```bash
ssh ubuntu@<vm-ip>
git clone https://github.com/TennisBoy/Crayon-Cookout.git
cd Crayon-Cookout
sudo ./scripts/setup-vm.sh
```

OS patches, Docker, firewall (deny inbound except SSH), swap on low-memory
instances, and it creates `.env` from the template.

## 5. Fill in `.env` ⬜

```bash
nano .env
```

Minimum for a working app:

```
SUPABASE_URL=https://jhwhkidhazzyztyuijhl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<the service_role secret from 2c>
CORS_ORIGINS=https://crayoncookout.com
```

`VITE_API_BASE_URL` stays at its default `/api` — same-origin, which is what
the apex-domain routing expects.

## 6. Deploy ⬜

```bash
./scripts/deploy.sh
curl -s localhost:8000/api/health/ready
```

Want `"database": true`. That proves the keys are *present*, not yet that they
are *correct* — step 8 proves that.

`deploy.sh` will not report success unless every container reports healthy, and
prints the rollback command if it fails.

## 7. Cloudflare Tunnel ⬜

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

## 8. Verify end to end ⬜

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
