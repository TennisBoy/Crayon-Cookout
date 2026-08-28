# Infrastructure

Where production lives and how to reach it. Facts, not instructions — the
ordered walkthrough for building it in the first place is
[`docs/SETUP.md`](docs/SETUP.md).

_Last verified: 2026-08-15._

> **No secrets in this file.** Everything here is either public (a hostname, a
> tunnel UUID) or an identifier that proves nothing on its own (a key
> fingerprint). Private keys, API keys and passwords live in exactly two places:
> `.env` on the VM, and your password manager. See [Secrets](#secrets).

---

## Production server

| | |
|---|---|
| Provider | Oracle Cloud Infrastructure (free tier) |
| Public IP | `40.233.64.114` |
| Hostname | `willyinsight-dev-srv02` |
| SSH user | `ubuntu` |
| Shape | `VM.Standard.E2.1.Micro` — x86_64, 2 vCPU, 952 MB RAM |
| Disk | 45 GB, ~39 GB free |
| Swap | 4 GB at `/swapfile`, persisted in `/etc/fstab` |
| OS | Ubuntu 20.04.6 LTS |

The IP is recorded here as a convenience, with one caveat worth knowing: the
Cloudflare Tunnel exists partly so the origin has no address anyone needs to
know. Writing it down trades a little of that away. It is defensible because
nothing but SSH is reachable on it — but do not put it anywhere more public
than this repo.

### Constraints that will bite you

- **952 MB of RAM.** The frontend Docker build (`npm ci` + Vite) is the
  memory-hungry step and is the reason for the 4 GB swapfile — `setup-vm.sh`
  only creates 2 GB by default, which was raised by hand before the first
  deploy. If a build dies with no message, check `sudo dmesg | grep -i killed`.
- **x86_64, not Ampere.** Ampere capacity was never available, so this is the
  Always Free x86 shape. Everything runs unchanged, but every artefact must be
  the **amd64** one: `cloudflared`, Docker packages, and the images built to
  ship here. An image built for arm64 loads without complaint and then fails
  to start. Run `uname -m` rather than trusting the shape you meant to create.
- **Ubuntu 20.04 left standard support in April 2025.** It runs the stack fine
  and Docker publishes `focal` packages, but security patching needs Ubuntu Pro
  (free for personal use, 5 machines) or a rebuild on a current LTS.

## SSH access

```bash
ssh -i ~/.ssh/ssh-key-2026-08-15.key ubuntu@40.233.64.114
```

| | |
|---|---|
| Private key (owner's machine) | `C:\Users\yinxi\.ssh\ssh-key-2026-08-15.key` |
| Fingerprint | `SHA256:EJ1L8dJbCtEMBgbC85Fmqcs+fjgNIDFSX/fx0NPJPPE` (RSA 2048) |
| Permissions | Restricted to the owning user — Windows OpenSSH refuses a key other accounts can read |

The key file itself is **not** recorded here and must never be committed. If it
is lost, the recovery path is the OCI console: attach a new public key to the
instance's VNIC, or use the serial console.

From Git Bash, use forward slashes — bash treats `\U` in a Windows path as an
escape and silently mangles it:

```bash
ssh -i /c/Users/yinxi/.ssh/ssh-key-2026-08-15.key ubuntu@40.233.64.114
```

Worth adding to `~/.ssh/config` so neither shell needs the flag:

```
Host crayon
    HostName 40.233.64.114
    User ubuntu
    IdentityFile ~/.ssh/ssh-key-2026-08-15.key
```

## Network posture

Three layers, all closed except SSH:

| Layer | Rule |
|---|---|
| OCI security list | Ingress TCP 22 from `0.0.0.0/0`; ICMP types 3/4 only |
| Host firewall (`ufw`) | `deny incoming`, `allow outgoing`, OpenSSH allowed |
| Container ports | Bound to `127.0.0.1` only — never the public interface |

**The VM does not answer `ping`, by design.** OCI permits ICMP 3/4 but not
echo, so a timed-out ping says nothing about its health. Test reachability with
a TCP probe instead:

```powershell
Test-NetConnection 40.233.64.114 -Port 22
```

Nothing inbound is needed for the app itself: `cloudflared` dials **outbound**
to Cloudflare, so 80 and 443 stay shut.

## Application

| | |
|---|---|
| Deployment root | `/home/ubuntu/crayon` |
| Contents | `docker-compose.yml`, `.env` (mode `600`) |
| Compose project | `crayon` |
| Docker | 28.1.1 |
| Compose | v2.35.1 |

**No source checkout lives on the VM.** The deployment root holds configuration
only. `docker-compose.yml` there has no `build:` section; images are built on a
workstation, shipped over SSH as a tarball, loaded into the VM's Docker daemon,
and selected by tag. **CI does not publish images** — it builds them to prove
the Dockerfiles work, then discards them. The full procedure is in
[docs/deployment.md](docs/deployment.md). The image references are overridable:

> **The compose file is version-controlled.** It lives at
> [`deploy/docker-compose.prod.yml`](deploy/docker-compose.prod.yml) and is
> pushed with `./scripts/push-compose.sh ubuntu@<vm-ip>`. Editing the VM's copy
> by hand is how it drifted from the repo once already: three Stripe variables
> were added to the reviewed file, never reached production, and a real payment
> failed with a 503 that looked like a code bug. `tests/test_compose_parity.py`
> now fails if the two files disagree about which variables the backend gets.

```
BACKEND_IMAGE=crayon-cookout-backend:<sha>
FRONTEND_IMAGE=crayon-cookout-frontend:<sha>
```

These are plain local tags, not registry references — the images exist only in
this VM's Docker daemon. Unset, they default to
`crayon-cookout-{backend,frontend}:latest`, which is a stale 12-day-old image
and never what you want in production.

| Service | Bound to | Image |
|---|---|---|
| `backend` | `127.0.0.1:8000` | `${BACKEND_IMAGE}` |
| `frontend` | `127.0.0.1:3000` | `${FRONTEND_IMAGE}` |

```bash
cd ~/crayon
# `docker compose pull` does NOT work here: these tags exist in no registry.
# Deploy by loading a shipped image, then pointing .env at its tag:
#   docker load -i /tmp/frontend-<sha>.tar
#   sed -i "s|^FRONTEND_IMAGE=.*|FRONTEND_IMAGE=crayon-cookout-frontend:<sha>|" .env
docker compose up -d
docker compose ps
docker compose logs backend --tail=50
curl -s localhost:8000/api/health               # {"status":"ok"}
curl -s localhost:8000/api/health/ready
```

Because there is no checkout, building on the VM is not possible without
re-cloning. That is deliberate — a 952 MB box builds slowly — but it means
**recovery depends on the images already present on this VM**, since there is
no registry to pull from. Every previously deployed tag is kept for exactly
that reason: a rollback is a tag change in `.env` plus `docker compose up -d`.
Do not run a blanket `docker image prune -a`. See [Recovery](#recovery).

`/api/health/ready` reports capabilities:

```json
{"status":"ok","environment":"production","capabilities":{"database":true,"vision":false}}
```

`database: true` means the Supabase settings are **present**, not that they are
**valid** — the client is constructed lazily. `vision: false` is expected until
`ANTHROPIC_API_KEY` is set.

`deploy.sh` refuses to report success unless every container is healthy, and
prints the rollback command (`git checkout <sha> && ./scripts/deploy.sh
--no-pull`) when it fails.

## Cloudflare

| | |
|---|---|
| Domain | `crayoncookout.com` (apex, no subdomain) |
| Tunnel name | `crayon-cookout` |
| Tunnel UUID | `2fab6971-c718-4981-b9d6-5b5cedbc98ea` |
| Config | `/home/ubuntu/.cloudflared/config.yml` |
| Credentials | `/home/ubuntu/.cloudflared/<UUID>.json` — **secret**, never commit |
| Origin cert | `/home/ubuntu/.cloudflared/cert.pem` — **secret** |

Ingress routes `/api/*` to the backend and everything else to the SPA, so both
are same-origin and CORS never applies. **The `/api` rule must come first** — a
catch-all placed above it swallows every API call and returns the SPA's HTML,
which looks like a broken frontend rather than a routing mistake.

```bash
cloudflared tunnel ingress validate
cloudflared tunnel list
sudo systemctl status cloudflared
```

## Supabase

| | |
|---|---|
| Project ref | `jhwhkidhazzyztyuijhl` |
| URL | `https://jhwhkidhazzyztyuijhl.supabase.co` (not secret) |
| Tables | `crayon_designs`, `collectibles` — both RLS enabled |
| Schema source | `supabase/schema.sql`, idempotent, re-runnable |

**Two credentials, two paths.** They fail independently, which is why
`/api/health/ready` reports them separately:

| Path | Credential | Serves |
|---|---|---|
| Direct PostgreSQL | `DATABASE_URL` | `crayon_designs`, `collectibles` |
| Supabase Auth (GoTrue) | `SUPABASE_SERVICE_ROLE_KEY` | register, OTP, login, reset, refresh |

`"database": true, "auth": false` is a real state: saved designs work, logins
fail. Both connect as owner-level roles that **bypass RLS**, so the `user_id`
scoping inside every repository method is the actual access control.

**Use the session-pooler DSN**, from the Supabase dashboard's Connect dialog —
not the direct `:5432` host, which is IPv6-only on newer projects and simply
will not resolve from this IPv4 VM. The DSN embeds the database password, so it
is a secret; `sslmode=require` belongs on it.

**The auth key must be the legacy JWT form** (starts `eyJ`). `supabase==2.11.0`
regex-checks that the key is JWT-shaped and raises `SupabaseException("Invalid
API key")` at client construction for the newer `sb_secret_…` format — before
any network call, so it presents as a client bug rather than an auth failure.
Upgrading the library is the alternative if legacy keys are ever withdrawn.

## GitHub

| | |
|---|---|
| Repo | `TennisBoy/Crayon-Cookout` (private) |
| Default branch | `main` (renamed from `master`, 2026-08-15) |
| VM deploy key | `~/.ssh/id_ed25519` on the VM, read-only |
| Fingerprint | `SHA256:9nmTUjaciKasKJo7hir3Ee4pJ2eCUtmOdzOs5sO4F2Q` (ED25519) |

The deploy key is **read-only on purpose**: the VM only ever pulls, so a
compromised VM cannot rewrite the repository. It is registered under repo
Settings → Deploy keys with write access unchecked.

## Secrets

Nothing in this table has its value recorded anywhere in this repository.

| Secret | Lives in | Rotate at |
|---|---|---|
| `DATABASE_URL` (embeds the DB password) | `/home/ubuntu/crayon/.env` (mode `600`) | Supabase → Settings → Database |
| Supabase `service_role` key (auth) | `/home/ubuntu/crayon/.env` (mode `600`) | Supabase → Settings → API Keys |
| `ANTHROPIC_API_KEY` | `.env` (optional; unset ⇒ scanner returns 503) | console.anthropic.com |
| Tunnel credentials | `~/.cloudflared/<UUID>.json` + `cert.pem` | Delete and recreate the tunnel |
| SSH private key | Owner's machine only | OCI console → attach a new key |
| GitHub deploy key | `~/.ssh/id_ed25519` on the VM | Remove in repo settings, generate a new pair |

Rules that are not negotiable:

- **Never paste a secret into a chat session.** To check whether something is
  configured, ask for a command that prints a boolean:
  `curl -s localhost:8000/api/health/ready`.
- **Never put a secret in a `VITE_*` variable.** Vite inlines those into the
  browser bundle at build time, publishing them to every visitor.
- **`.env.example` is tracked; `.env` is not.** The template must stay empty.
  A real value pasted into `.env.example` gets committed.
- **The `service_role` key bypasses row-level security.** Anyone holding it can
  read and write every user's data. Backend container only.

### Gotcha: duplicate keys in `.env`

Docker Compose's dotenv parser takes the **last** definition of a variable. A
key appended to the top of `.env` while the template's empty
`SUPABASE_SERVICE_ROLE_KEY=` line remains below it resolves to empty, and the
app reports `database: false` with a perfectly correct-looking file. Verify
with:

```bash
grep -c ^SUPABASE_SERVICE_ROLE_KEY ~/crayon/.env        # must be 1
docker compose config | grep SUPABASE_SERVICE_ROLE_KEY  # must be non-empty
```

## Recovery

| Situation | Path back |
|---|---|
| Bad deploy | Set `BACKEND_IMAGE`/`FRONTEND_IMAGE` in `.env` to the previous SHA tag, then `docker compose up -d` |
| Container unhealthy | `docker compose logs <service> --tail=80`, then `docker compose up -d --force-recreate <service>` |
| `database: false` | `.env` keys missing, duplicated, or empty — fix, then `docker compose up -d` |
| Tunnel down (502 from Cloudflare) | `sudo systemctl restart cloudflared`; containers up? `docker compose ps` |
| `/api/*` returns HTML | Ingress rule order — `/api` must precede the catch-all |
| VM unreachable | OCI console → instance state, then serial console. Do not trust `ping` |
| Need an image the VM does not have | There is no registry to pull from. Build it on a workstation and ship it (see [docs/deployment.md](docs/deployment.md)). If no workstation is available, re-clone on the VM and build in the clone — slow on this box, and it needs the swapfile, but it works offline |
| Total VM loss | Rebuild from `docs/SETUP.md` steps 3–7. Supabase holds all persistent data; the VM is disposable |

The VM stores no durable state. Designs and collectibles live in Postgres, so
losing the instance costs a rebuild, not data.
