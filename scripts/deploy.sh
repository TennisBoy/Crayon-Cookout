#!/usr/bin/env bash
#
# Build and start (or update) the stack.
#
#   ./scripts/deploy.sh              # pull latest, rebuild, restart
#   ./scripts/deploy.sh --no-pull    # rebuild what is checked out now
#
# Safe to run repeatedly. Verifies health before declaring success, and tells
# you how to roll back if it fails.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PULL=true
[[ "${1:-}" == "--no-pull" ]] && PULL=false

log()  { printf '\033[1;35m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "Docker is missing — run scripts/setup-vm.sh"
docker compose version >/dev/null 2>&1 || fail "The Docker Compose plugin is missing"

[[ -f .env ]] || fail ".env not found. cp .env.example .env and fill it in."

# A missing Supabase key is not fatal — the stack boots and reports 503 on the
# routes that need it — but it is almost never what you meant on a deploy.
if ! grep -qE '^SUPABASE_URL=.+' .env || ! grep -qE '^SUPABASE_SERVICE_ROLE_KEY=.+' .env; then
    printf '\033[1;33m!!\033[0m SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY look empty.\n'
    printf '   The app will start, but auth and saved designs will return 503.\n'
fi

PREVIOUS="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

if [[ "$PULL" == true ]] && [[ -d .git ]]; then
    log "Pulling latest"
    git pull --ff-only
fi

log "Building images"
docker compose build

log "Starting services"
docker compose up -d --remove-orphans

log "Waiting for health"
deadline=$((SECONDS + 120))
while (( SECONDS < deadline )); do
    unhealthy="$(docker compose ps --format '{{.Service}} {{.Health}}' \
                 | grep -Ev ' (healthy)$' || true)"
    [[ -z "$unhealthy" ]] && break
    sleep 5
done

if [[ -n "${unhealthy:-}" ]]; then
    printf '\033[1;31mxx\033[0m Services did not become healthy:\n%s\n' "$unhealthy" >&2
    echo "Logs:      docker compose logs --tail=80" >&2
    echo "Roll back: git checkout ${PREVIOUS} && ./scripts/deploy.sh --no-pull" >&2
    exit 1
fi

log "Pruning old images"
docker image prune -f >/dev/null

log "Deployed"
docker compose ps
echo
echo "Local check:  curl -s localhost:${BACKEND_PORT:-8000}/api/health"
echo "Readiness:    curl -s localhost:${BACKEND_PORT:-8000}/api/health/ready"
