# Cloudflare Tunnel

The VM exposes **no inbound ports**. `cloudflared` runs on the VM, dials *out*
to Cloudflare, and Cloudflare forwards requests down that connection to the
loopback ports the containers bind to.

That is why there is no Nginx, no Caddy, and no TLS configuration in this
repository: Cloudflare terminates TLS at its edge, and the last hop is
`127.0.0.1`.

```
Browser → Cloudflare edge (TLS) → tunnel → VM 127.0.0.1 → container
```

## Ports

Both bind to loopback only — see `docker-compose.yml`. Dropping the
`127.0.0.1:` prefix would publish them on the VM's public interface, which is
the one change that would undo this design.

| Service | Host port | Serves |
|---|---|---|
| frontend | `127.0.0.1:3000` | the SPA, with history fallback |
| backend | `127.0.0.1:8000` | the API under `/api` |

## Routing

Two hostname routes, both on the same hostname. Order matters — the more
specific path must come first.

| Path | Service |
|---|---|
| `crayon.example.com/api/*` | `http://localhost:8000` |
| `crayon.example.com/*` | `http://localhost:3000` |

Same-origin is deliberate. The SPA calls `/api/...` on its own hostname, so
the browser never makes a cross-origin request and CORS never applies. That is
why `VITE_API_BASE_URL` defaults to `/api`.

## Install

```bash
# This VM is x86_64 (VM.Standard.E2.1.Micro), so the amd64 .deb is correct.
# On an Ampere/arm64 instance use the linux-arm64 .deb instead;
# check with `uname -m` rather than assuming.
curl -fsSLo cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

cloudflared tunnel login          # opens a browser URL to authorise
cloudflared tunnel create crayon-cookout
```

`create` prints a tunnel UUID and writes credentials to
`~/.cloudflared/<UUID>.json`. Note the UUID.

## Configure

`~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: /home/ubuntu/.cloudflared/<TUNNEL-UUID>.json

ingress:
  # Most specific first — a leading catch-all would swallow /api.
  - hostname: crayon.example.com
    path: ^/api(/.*)?$
    service: http://localhost:8000

  - hostname: crayon.example.com
    service: http://localhost:3000

  # Required: every ingress list must end with a catch-all.
  - service: http_status:404
```

Point DNS at the tunnel, then run it as a service:

```bash
cloudflared tunnel route dns crayon-cookout crayon.example.com
sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

## Verify

```bash
# On the VM — the containers themselves
curl -s localhost:8000/api/health          # {"status":"ok"}
curl -sI localhost:3000 | head -1          # 200 OK

# From anywhere — through the tunnel
curl -s https://crayon.example.com/api/health
curl -sI https://crayon.example.com | head -1
```

If the local checks pass and the public ones do not, the problem is the tunnel
or DNS, not the app.

## After changing the hostname

`CORS_ORIGINS` in `.env` should list the public origin. With same-origin
routing it is not exercised, but it matters if you ever serve the SPA from a
different hostname than the API.

`VITE_API_BASE_URL` is inlined at **build** time. Changing it needs
`docker compose build frontend`, not just a restart.

## Troubleshooting

**502 from Cloudflare** — the tunnel is up but the service is not. Check
`docker compose ps`.

**`/api/...` returns the SPA's HTML** — the ingress rules are in the wrong
order, or the `path` regex is wrong. The `/api` rule must come first.

**Deep links 404 on refresh** — the frontend container is not doing SPA
fallback. Its command is `serve -s dist`; the `-s` is what rewrites unknown
paths to `index.html`.

**Tunnel connects, hostname does not resolve** — `cloudflared tunnel route dns`
was not run, or the domain is not on the same Cloudflare account.
