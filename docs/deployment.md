# Deployment

From a bare Oracle Cloud VM to a running app.

## Prerequisites

- An Ubuntu 22.04+ VM. **Production runs x86_64** — `VM.Standard.E2.1.Micro`,
  Oracle's Always Free x86 shape. Nothing here is architecture-specific, so an
  Ampere/arm64 instance works too, but images are built off the VM (see
  [Updating](#updating)) and **an image built for the wrong architecture will
  not start**. Confirm with `uname -m` on the VM before building.
- A Supabase project — see [supabase-setup.md](supabase-setup.md).
- A domain on Cloudflare — see [cloudflare-tunnel.md](cloudflare-tunnel.md).

## How production is actually updated

**There is no source checkout on the VM and no image registry.** `~/crayon`
holds `docker-compose.yml` and `.env`, nothing else. Images are built on a
workstation, shipped over SSH as a tarball, and selected by tag in `.env`.

This is worth stating plainly because two earlier versions of this document
described a process that does not exist: building on the VM (there is nothing
to build from, and 952 MB of RAM would struggle), and pulling tagged images
from ghcr (CI builds images to prove the Dockerfiles work, but publishes
nothing).

`scripts/deploy.sh` builds from a checkout using the **root** `docker-compose.yml`,
which has `build:` keys. That is a local-development tool. It is not how
production is updated and will not work on the VM.

### The steps

Merge to `main` first — the tag is the commit sha, so an unmerged sha is not
reproducible. Then, **from PowerShell, never Git Bash** (MSYS rewrites
leading-slash arguments, which once baked `C:/Program Files/Git/api` into the
bundle and broke every API call):

```powershell
$sha = git rev-parse --short HEAD

docker build --build-arg VITE_API_BASE_URL=/api -t crayon-cookout-frontend:$sha .\frontend
docker build -t crayon-cookout-backend:$sha .\backend      # only if the API changed
```

Verify the image before it leaves the machine — a bad bundle is a broken site,
and the build succeeds either way:

```powershell
docker image inspect crayon-cookout-frontend:$sha --format '{{.Os}}/{{.Architecture}}'   # linux/amd64
docker run --rm --entrypoint sh crayon-cookout-frontend:$sha -c "grep -rl 'Program Files' /app/dist | wc -l"   # 0
```

Ship it. Use a file and `scp` rather than piping `docker save` into `ssh` —
PowerShell pipes are text-oriented and will corrupt a binary stream:

```powershell
docker save -o $env:TEMP\frontend-$sha.tar crayon-cookout-frontend:$sha
scp -i ~/.ssh/<key> $env:TEMP\frontend-$sha.tar ubuntu@<vm-ip>:/tmp/
```

Load and cut over on the VM. Compare checksums first: a truncated transfer
loads as a corrupt image:

```bash
md5sum /tmp/frontend-<sha>.tar          # must match the local checksum
docker load -i /tmp/frontend-<sha>.tar

cd ~/crayon
cp -f .env .env.bak-$(date +%Y%m%d-%H%M%S)
sed -i "s|^FRONTEND_IMAGE=.*|FRONTEND_IMAGE=crayon-cookout-frontend:<sha>|" .env
docker compose config | grep image:      # confirm both tags before restarting
docker compose up -d
rm -f /tmp/frontend-<sha>.tar
```

Only the changed service needs a new tag; leaving `BACKEND_IMAGE` alone means
the backend container is not recreated at all.

If the compose file itself changed, push it with
`./scripts/push-compose.sh ubuntu@<vm-ip>` rather than editing the VM's copy.
Hand-editing is how it drifted once already: three Stripe variables never
reached the container and a real payment failed with a 503.

## Verifying a deploy

A healthy container is not a working site. All four:

```bash
docker compose ps                                  # every service healthy
curl -s localhost:8000/api/health/ready            # database/auth true
curl -sI https://crayoncookout.com/crayon-favicon.svg?v=2 | grep -i content-type
```

The third one is not paranoia. `serve -s` rewrites any unmatched path to
`index.html`, so a **missing** asset is served as HTML with a `200`. Check the
content-type, not the status.

Then load the page in a browser and look at it. Twice a change was declared
deployed on the strength of `curl /api/health` while the page itself was
broken. Note that the SPA shows a splash for several seconds while auth
resolves — a screenshot taken too early shows a spinner and proves nothing.

## Rollback

Every previously deployed image is still on the VM, so a rollback is a tag
change and a restart — no rebuild, no network:

```bash
cd ~/crayon
docker images crayon-cookout-frontend --format '{{.Tag}}'   # pick the previous sha
sed -i "s|^FRONTEND_IMAGE=.*|FRONTEND_IMAGE=crayon-cookout-frontend:<previous-sha>|" .env
docker compose up -d
```

This is the fastest path back and does not depend on a workstation, a registry
or a working build. **Do not prune images aggressively** — that is what makes
it possible.

## First deploy

```bash
ssh ubuntu@<vm-ip>
git clone https://github.com/TennisBoy/Crayon-Cookout.git
cd Crayon-Cookout
sudo ./scripts/setup-vm.sh     # OS updates, Docker, firewall, swap
```

Then create `~/crayon`, put `.env` there (see `.env.example`), push the compose
file with `./scripts/push-compose.sh`, and follow
[The steps](#the-steps) to build and ship the first images. Run
`supabase/schema.sql` once against your Supabase project, and install
`cloudflared`.

The checkout is only needed for `setup-vm.sh`; it is not used afterwards.

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
| `FRONTEND_IMAGE`, `BACKEND_IMAGE` | Default to `:latest`, which is **not** what you want in production — set both to explicit shas |

**`VITE_API_BASE_URL` is a build-time variable.** Vite inlines it into the
bundle, so it is fixed when the image is built. Changing it needs a new image;
a restart will not pick it up. This trips people up regularly.

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

The frontend build (`npm ci` + Vite) is the memory-hungry step, which is the
main reason it happens on a workstation rather than on a 952 MB VM. The
swapfile `setup-vm.sh` creates (raised to 4 GB by hand) is what makes the
runtime comfortable, not the build.

Disk is the thing to watch instead: every deployed image is kept for rollback.
45 GB has been ample, but if it tightens, remove old tags deliberately with
`docker image rm` rather than running a blanket `docker image prune -a`, which
would take the rollback path with it.

## Not included

- **No CI/CD.** CI builds the images to prove the Dockerfiles work, but
  publishes nothing and never touches the VM. Shipping is manual: build, `scp`,
  `docker load`, retag in `.env`. A workflow that pushes to a registry and
  SSHes in would be the natural next step.
- **No image registry.** Images move as tarballs over SSH.
- **No backups.** Supabase handles Postgres backups on paid plans; on the free
  tier, take your own via the dashboard.
- **No monitoring.** Health endpoints exist and Docker restarts unhealthy
  containers, but nothing alerts you.
