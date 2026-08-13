# Deployment

From a bare Oracle Cloud VM to a running app.

## Prerequisites

- An Ubuntu 22.04+ VM. Oracle's free Ampere tier (arm64) is what this targets;
  every image here is multi-arch, so amd64 works unchanged.
- A Supabase project — see [supabase-setup.md](supabase-setup.md).
- A domain on Cloudflare — see [cloudflare-tunnel.md](cloudflare-tunnel.md).

## First deploy

```bash
ssh ubuntu@<vm-ip>

git clone https://github.com/TennisBoy/Crayon-Cookout.git
cd Crayon-Cookout

sudo ./scripts/setup-vm.sh     # OS updates, Docker, firewall, swap, .env
nano .env                      # Supabase keys
./scripts/deploy.sh            # build, start, wait for health
```

Then run `supabase/schema.sql` once against your Supabase project, and install
`cloudflared`.

Check it:

```bash
curl -s localhost:8000/api/health/ready
```

`"database": true` means Supabase is wired up.

## Updating

```bash
cd Crayon-Cookout
./scripts/deploy.sh            # pulls, rebuilds, restarts, verifies health
```

`deploy.sh` refuses to report success unless every container reports healthy,
and prints the rollback command if it fails.

## Rollback

```bash
git checkout <previous-sha>
./scripts/deploy.sh --no-pull
```

Images are rebuilt from source, so a rollback is just a checkout. There is no
image registry to coordinate with.

## What runs where

| Component | Where | Port |
|---|---|---|
| React SPA | `frontend` container, `serve -s dist` | `127.0.0.1:3000` |
| FastAPI | `backend` container, uvicorn, 2 workers | `127.0.0.1:8000` |
| Postgres | Supabase, managed | — |
| TLS + routing | Cloudflare edge | — |

Nothing listens on a public interface. `ufw` denies inbound apart from SSH, and
the containers bind to loopback.

## Environment variables

Full list in `.env.example`. The ones that decide behaviour:

| Variable | Effect if unset |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Auth and designs return 503; the app still boots |
| `ANTHROPIC_API_KEY` | Collectible scanning returns 503; scans read as "didn't match" |
| `CORS_ORIGINS` | Defaults to localhost; `*` is rejected at startup |
| `VITE_API_BASE_URL` | Defaults to `/api` (same-origin) |

**`VITE_API_BASE_URL` is a build-time variable.** Vite inlines it into the
bundle. Changing it requires `docker compose build frontend`; a restart will
not pick it up. This trips people up regularly.

## Operations

```bash
docker compose ps                      # health
docker compose logs -f backend         # follow
docker compose logs --tail=100         # recent
docker compose restart backend         # reload .env changes
docker compose down                    # stop everything
```

Logs are capped at 10MB × 3 files per service, so they cannot fill the disk.

## Resource notes

The frontend image build is the memory-hungry step. `setup-vm.sh` adds 2GB of
swap on instances with under 4GB of RAM for exactly this reason. If a build is
killed with no explanation, that is why — check `dmesg | tail`.

To build on a bigger machine instead, push images to a registry and swap the
`build:` keys for `image:` in `docker-compose.yml`.

## Not included

- **No CI/CD.** Deployment is `git pull` on the VM. A GitHub Actions workflow
  that SSHes in would be the natural next step.
- **No image registry.** Images are built on the VM from source.
- **No backups.** Supabase handles Postgres backups on paid plans; on the free
  tier, take your own via the dashboard.
- **No monitoring.** Health endpoints exist and Docker restarts unhealthy
  containers, but nothing alerts you.
