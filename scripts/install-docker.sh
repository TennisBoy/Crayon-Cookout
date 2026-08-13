#!/usr/bin/env bash
#
# Install Docker Engine + Compose plugin on a fresh Ubuntu host.
# Idempotent: re-running on a configured box is a no-op.
#
#   sudo ./scripts/install-docker.sh
#
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Run with sudo: sudo $0" >&2
    exit 1
fi

TARGET_USER="${SUDO_USER:-${DOCKER_USER:-}}"

log() { printf '\033[1;35m==>\033[0m %s\n' "$*"; }

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker and the Compose plugin are already installed — nothing to do."
    docker --version
    docker compose version
    exit 0
fi

log "Installing prerequisites"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg

log "Adding Docker's apt repository"
install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
fi

# dpkg reports the real architecture, so this works unchanged on Oracle's
# arm64 (Ampere) instances as well as amd64.
ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")"
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

log "Installing Docker Engine"
apt-get update -qq
apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

log "Enabling the service"
systemctl enable --now docker

if [[ -n "$TARGET_USER" ]] && id "$TARGET_USER" >/dev/null 2>&1; then
    log "Adding $TARGET_USER to the docker group"
    usermod -aG docker "$TARGET_USER"
    echo "   Log out and back in for that to take effect."
fi

log "Done"
docker --version
docker compose version
