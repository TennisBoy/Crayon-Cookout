#!/usr/bin/env bash
#
# Prepare a fresh Ubuntu VM (Oracle Cloud or anywhere) to run Crayon Cookout.
# Idempotent — safe to re-run.
#
#   sudo ./scripts/setup-vm.sh
#
# What it does: patches the OS, installs Docker, locks the firewall down, and
# leaves a .env for you to fill in. It does NOT open any inbound port — this
# deployment is reached through a Cloudflare Tunnel, which dials outbound.
#
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Run with sudo: sudo $0" >&2
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_USER="${SUDO_USER:-ubuntu}"

log()  { printf '\033[1;35m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*"; }

log "Updating the system"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl git ca-certificates ufw

log "Installing Docker"
"${REPO_ROOT}/scripts/install-docker.sh"

# --- Firewall ---------------------------------------------------------------
# Deny inbound by default. Cloudflare Tunnel makes an OUTBOUND connection, so
# nothing needs to be opened for the app to be reachable. SSH is allowed so you
# do not lock yourself out.
#
# Oracle Cloud also has its own Security List / NSG at the VCN level. This only
# configures the host firewall; the cloud-level rules are separate and, for a
# tunnel-only deployment, should stay closed too.
log "Configuring the host firewall"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null
ufw --force enable >/dev/null
ufw status verbose

# Oracle images ship restrictive iptables rules that outlive ufw. Persisting
# them is out of scope here; if inbound SSH breaks after a reboot, that is
# where to look.
if iptables -L INPUT -n 2>/dev/null | grep -q REJECT; then
    warn "Oracle's default iptables REJECT rules are present."
    warn "They do not affect an outbound Cloudflare Tunnel, but will block any"
    warn "port you try to expose directly."
fi

# --- Swap -------------------------------------------------------------------
# The free Ampere tier has enough RAM, but a Docker build of the frontend is
# memory-hungry. A little swap prevents the OOM killer mid-build.
if [[ ! -f /swapfile ]] && [[ "$(free -m | awk '/^Mem:/{print $2}')" -lt 4096 ]]; then
    log "Adding a 2G swapfile (low-memory instance)"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# --- Environment ------------------------------------------------------------
if [[ ! -f "${REPO_ROOT}/.env" ]]; then
    log "Creating .env from the template"
    cp "${REPO_ROOT}/.env.example" "${REPO_ROOT}/.env"
    chown "${TARGET_USER}:${TARGET_USER}" "${REPO_ROOT}/.env"
    chmod 600 "${REPO_ROOT}/.env"
    warn "Fill in ${REPO_ROOT}/.env before deploying — see docs/supabase-setup.md"
fi

log "VM ready"
cat <<EOF

Next:
  1. Edit .env                          (Supabase keys — docs/supabase-setup.md)
  2. Run supabase/schema.sql            (once, against your Supabase project)
  3. ./scripts/deploy.sh                (build and start)
  4. Install cloudflared                (docs/cloudflare-tunnel.md)

Nothing is exposed to the internet yet. That is deliberate.
EOF
