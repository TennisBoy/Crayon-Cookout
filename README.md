# Crayon Cookout

Every crayon deserves a second stroke. Kids melt, mould and collect crayons —
design one in the Kitchen, save it to the Library, and unlock physical
collectibles by photographing the real thing.

React SPA → FastAPI → Supabase, all behind a Cloudflare Tunnel on a single VM.

## Quick start

```bash
git clone https://github.com/TennisBoy/Crayon-Cookout.git
cd Crayon-Cookout
cp .env.example .env          # fill in Supabase keys
docker compose up -d --build
```

The stack starts **with or without** credentials. Unconfigured capabilities
return `503` with a clear message instead of failing at boot, so you can always
get to a running system and fill keys in afterwards.

```bash
curl -s localhost:8000/api/health/ready
```

## Architecture

```
             Cloudflare edge (TLS)
                      │
                 tunnel (outbound)
                      │
          ┌───────────┴───────────┐
          │        VM             │
    /api/*│                       │/*
  ┌───────▼────────┐   ┌──────────▼────────┐
  │ FastAPI :8000  │   │ React SPA :3000   │
  └───────┬────────┘   └───────────────────┘
          │
          ├── PostgreSQL  (designs, collectibles — direct SQL)
          └── Supabase Auth (register, OTP, login, reset, refresh)
```

Two credentials, deliberately: `DATABASE_URL` for the tables, a Supabase key for
auth. GoTrue owns `auth.users`, password hashing and the OTP emails, so there is
no SQL equivalent for the auth half.

Both containers bind to `127.0.0.1` only. Nothing is reachable from the
internet except through the tunnel.

## Layout

```
frontend/          React 18 + Vite SPA
  src/pages/         route components
  src/components/    UI; components/ui/ = 7 hand-written primitives
  src/lib/api/       the ONLY place that calls fetch
  src/lib/adapters/  auth · designs · vision · consent
backend/           FastAPI
  app/api/routes/    HTTP layer
  app/services/      business rules
  app/repositories/  persistence
  app/schemas/       validation
supabase/          schema.sql · seed.sql
scripts/           setup-vm.sh · install-docker.sh · deploy.sh
docs/              setup and deployment guides
```

The frontend keeps its network calls behind `lib/api/client.ts` and its backend
calls behind `lib/adapters/`. Pages call adapters; adapters call the client;
nothing else calls `fetch`. Replacing the backend is a change to one directory —
which is exactly how this app was moved off its previous hosted platform.

## Development

```bash
# frontend
cd frontend && npm install && npm run dev      # :5173

# backend
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload        # :8000, docs at /docs
```

Set `ENVIRONMENT=development` to enable the interactive API docs; they are off
in production.

## Tests

```bash
cd frontend && npm run verify  # typecheck + lint + 98 tests + build
cd backend && pytest && ruff check .   # 73 tests
```

Neither suite needs cloud credentials — the backend fakes its repositories and
the frontend mocks `fetch`. CI never needs a secret.

## Documentation

| Guide | Covers |
|---|---|
| **[docs/SETUP.md](docs/SETUP.md)** | **Start here — ordered first-time setup, with progress** |
| [docs/supabase-setup.md](docs/supabase-setup.md) | Creating the project, schema, keys, auth |
| [docs/deployment.md](docs/deployment.md) | Bare VM to running app; updates and rollback |
| [docs/cloudflare-tunnel.md](docs/cloudflare-tunnel.md) | Tunnel install, ingress rules, verification |
| [CLAUDE.md](CLAUDE.md) | Conventions and the non-obvious parts of this codebase |

## Security

- The Supabase **service role key** is backend-only and never in a `VITE_*`
  variable — Vite inlines those into the public bundle.
- Row-level security is on for every table, scoped to `auth.uid()`.
- Photo verification runs server-side. It is the anti-cheat for collectibles;
  a key in the browser would defeat it.
- `CORS_ORIGINS` rejects `*` at startup.
- Interactive API docs are disabled in production.
- Containers run as non-root with `no-new-privileges`.

## Status

Working: designs CRUD, email/password auth with OTP verification, password
reset, collectible photo verification with server-side persistence, and the
whole SPA. CI runs both suites plus the Docker builds on every push.

Not wired: Google sign-in (the adapter throws an honest "not configured" rather
than failing silently) and the OAuth/MCP consent flow, which was specific to
the platform this app was moved off and has no equivalent yet.
