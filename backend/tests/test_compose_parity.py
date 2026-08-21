"""The deployed compose file must not drift from the reviewed one.

This exists because it already happened. Stripe support added three variables
to docker-compose.yml, but production runs its own hand-maintained file that
never got them -- so the keys sat in .env, never reached the container, and the
webhook returned 503 on a real payment. Nothing caught it, because the file that
matters was not the file under review.
"""
from pathlib import Path

import pytest
import yaml

REPO = Path(__file__).resolve().parents[2]
DEV = REPO / "docker-compose.yml"
PROD = REPO / "deploy" / "docker-compose.prod.yml"


def backend_env(path: Path) -> dict:
    compose = yaml.safe_load(path.read_text(encoding="utf-8"))
    return compose["services"]["backend"].get("environment", {})


def test_both_compose_files_exist():
    assert DEV.exists(), "docker-compose.yml is the local/build definition"
    assert PROD.exists(), "deploy/docker-compose.prod.yml is what production runs"


def test_production_passes_every_variable_the_dev_file_does():
    """A variable the app reads is useless if production never forwards it."""
    missing = set(backend_env(DEV)) - set(backend_env(PROD))
    assert not missing, (
        f"deploy/docker-compose.prod.yml is missing {sorted(missing)}. "
        "Add them there too, or production will read empty values."
    )


def test_production_builds_nothing():
    """Production pulls images by tag; a build section on a 1 GB VM is a trap."""
    compose = yaml.safe_load(PROD.read_text(encoding="utf-8"))
    for name, service in compose["services"].items():
        assert "build" not in service, f"{name} must not build in production"
        assert "image" in service, f"{name} needs an image tag"


def test_production_binds_ports_to_loopback_only():
    """The 127.0.0.1 prefix is the security boundary in front of the tunnel."""
    compose = yaml.safe_load(PROD.read_text(encoding="utf-8"))
    for name, service in compose["services"].items():
        for port in service.get("ports", []):
            assert str(port).startswith("127.0.0.1:"), (
                f"{name} publishes {port} on every interface, "
                "which exposes it beyond the Cloudflare tunnel"
            )


@pytest.mark.parametrize(
    "key", ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "DATABASE_URL"]
)
def test_secrets_come_from_the_environment_not_the_file(key):
    env = backend_env(PROD)
    assert key in env, f"{key} is not forwarded to the backend in production"
    assert str(env[key]).startswith("${"), f"{key} must be interpolated, never literal"
