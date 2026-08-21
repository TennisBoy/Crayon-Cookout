#!/usr/bin/env bash
#
# Copy the reviewed production compose file to the VM.
#
#   ./scripts/push-compose.sh ubuntu@<vm-ip>
#   SSH_KEY=~/.ssh/my-key ./scripts/push-compose.sh ubuntu@<vm-ip>
#
# Production used to run a hand-maintained copy of this file. It drifted from
# the repo, three Stripe variables never reached the container, and a real
# payment failed with a 503. The file that runs production should be the file
# that went through review.
#
set -euo pipefail

TARGET="${1:-}"
[[ -n "$TARGET" ]] || { echo "usage: $0 user@host [remote-dir]" >&2; exit 1; }
REMOTE_DIR="${2:-crayon}"

# Without an entry in ~/.ssh/config there is no identity to offer, and ssh
# fails with a bare "Permission denied (publickey)". Let the caller name a key.
SSH_OPTS=()
[[ -n "${SSH_KEY:-}" ]] && SSH_OPTS=(-i "$SSH_KEY")

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${REPO_ROOT}/deploy/docker-compose.prod.yml"

[[ -f "$SRC" ]] || { echo "missing $SRC" >&2; exit 1; }

echo "==> copying compose file to ${TARGET}:${REMOTE_DIR}/docker-compose.yml"
# Keep the previous one: a bad compose file is a stopped site, and rolling back
# should not require this script to still work.
ssh "${SSH_OPTS[@]}" "$TARGET" "cd ${REMOTE_DIR} && cp -f docker-compose.yml docker-compose.yml.bak 2>/dev/null || true"
ssh "${SSH_OPTS[@]}" "$TARGET" "cat > ${REMOTE_DIR}/docker-compose.yml" < "$SRC"

echo "==> validating on the VM"
ssh "${SSH_OPTS[@]}" "$TARGET" "cd ${REMOTE_DIR} && docker compose config --quiet && echo 'valid'"

echo "==> done. Apply with:  ssh ${TARGET} 'cd ${REMOTE_DIR} && docker compose up -d'"
