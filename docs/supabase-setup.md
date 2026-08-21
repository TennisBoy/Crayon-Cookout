# Supabase setup

Everything here is manual and one-time. Supabase project creation has no
unauthenticated API, so this cannot be scripted — but the database side is
fully reproducible from `supabase/schema.sql`.

Budget about ten minutes.

## 1. Create the project

1. Sign in at <https://supabase.com/dashboard>
2. **New project**
   - **Name** — `crayon-cookout`
   - **Database password** — generate one and store it in your password
     manager. **The app needs this**: designs and collectibles are reached over
     direct SQL, and the password is embedded in `DATABASE_URL`. You cannot
     recover it later, only reset it — and resetting means updating `.env`.
   - **Region** — pick the one nearest your Oracle VM. Every API call is a
     round trip; a mismatched region is the single easiest way to make the app
     feel slow.
3. Wait for provisioning (~2 minutes).

## 2. Create the schema

**SQL Editor** → **New query** → paste all of `supabase/schema.sql` → **Run**.

It is idempotent, so re-running after a schema change is safe.

You should see `crayon_designs` and `collectibles` under **Table Editor**, both
marked **RLS enabled**.

Optional sample data, for development only:

1. **Authentication → Users → Add user** — create one with a real-looking email
2. **SQL Editor** → paste `supabase/seed.sql` → **Run**

The seed attaches its rows to the oldest user in the project. Never run it
against production.

## 3. Collect the credentials

The app needs two, covering different halves. Either can be missing without the
other noticing — `/api/health/ready` reports `database` and `auth` separately.

**Connect** (top of the dashboard) → **Session pooler**:

| What | `.env` variable | Notes |
|---|---|---|
| Session pooler DSN | `DATABASE_URL` | Designs and collectibles. **Embeds the DB password — secret.** Add `?sslmode=require` |

Do not use the direct `:5432` connection string. It is IPv6-only on newer
projects, so from an IPv4 VM it hangs rather than reporting anything useful.

**Project Settings → API**:

| Dashboard label | `.env` variable | Notes |
|---|---|---|
| Project URL | `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `service_role` secret | `SUPABASE_SERVICE_ROLE_KEY` | Auth only. **Backend only.** Must be the legacy JWT (`eyJ…`) |
| `anon` public | `SUPABASE_ANON_KEY` | Currently unused |

`supabase==2.11.0` regex-checks that the key is JWT-shaped, so the newer
`sb_secret_…` format raises `Invalid API key` at client construction — before
any network call.

### About the service role key

It bypasses row-level security completely. Anyone holding it can read and write
every user's data.

- It goes in `.env` on the VM, which is gitignored and `chmod 600`.
- It is injected into the backend container only.
- It must **never** appear in a `VITE_*` variable. Vite inlines those into the
  bundle at build time, which publishes them to every visitor.

If it leaks: **Project Settings → API → Rotate**, then update `.env` and
`./scripts/deploy.sh`.

The `anon` key is unused today because the browser only ever talks to our
FastAPI backend, never to Supabase directly. Keeping it that way means one
place to enforce authorisation instead of two.

## 4. Configure auth

**Authentication → Providers → Email**:

- **Enable email provider** — on
- **Confirm email** — on. The register page already implements the six-digit
  OTP step, so this matches the UI you have.

**Authentication → URL Configuration**:

- **Site URL** — your public hostname, e.g. `https://crayon.example.com`
- **Redirect URLs** — add `https://crayon.example.com/reset-password`

Without the redirect URL, password-reset emails will refuse to link back.

### Google sign-in (optional, not wired)

The login and register pages have a "Continue with Google" button. The adapter
deliberately throws an honest "not configured" error rather than doing nothing.

To finish it: enable the Google provider here, add your OAuth client ID and
secret, then implement `signInWithProvider` in
`frontend/src/lib/adapters/auth.ts` against Supabase's OAuth flow.

## 5. Point the app at it

On the VM:

```bash
cp .env.example .env    # if you have not already
nano .env               # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
./scripts/deploy.sh
```

Confirm:

```bash
curl -s localhost:8000/api/health/ready
# {"status":"ok","environment":"production",
#  "capabilities":{"database":true,"vision":false}}
```

`"database": true` means the keys are present. Register an account through the
UI to confirm they are also correct.

## Schema changes later

There is no migration tool wired up — for a schema this size it would be
ceremony. The workflow is:

1. Edit `supabase/schema.sql` so it still describes the whole schema
2. Write the incremental statement (`alter table ...`) and run it in the SQL
   Editor
3. Commit both, so a fresh project can be built from the file alone

If the schema grows past a handful of tables, adopt the Supabase CLI's
migrations directory instead. This approach trades tooling for simplicity and
stops paying off once several people are changing the schema at once.

## Troubleshooting

**`"database": false`** — `DATABASE_URL` is unset or empty. Check for typos in
`.env`, then `docker compose up -d`. Values are read at container start.

**`"auth": false`** — `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is unset.
Designs still work; registration and login do not.

**Requests hang instead of failing** — you used the direct `:5432` DSN on an
IPv4-only host. Switch to the session pooler string.

**Every API call returns 503** — same cause. The backend logs a warning at
startup: `docker compose logs backend | head`.

**Registration succeeds but no email arrives** — Supabase's built-in SMTP is
heavily rate-limited and is for testing only. Configure your own SMTP under
**Project Settings → Auth → SMTP** before real users touch it.

**`relation "crayon_designs" does not exist`** — `schema.sql` was never run, or
was run against a different project.
