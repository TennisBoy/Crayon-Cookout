"""Admin tool: grant or revoke access without a payment.

    Run inside the backend container, from ~/crayon on the VM:

    python -m app.admin grant --email you@example.com

    ...and `list` or `revoke` in place of `grant`.

Deliberately a command on the server, not an endpoint and not an "admin" flag on
an account. The webhook is the only thing that may grant an entitlement over
HTTP; adding a second path -- however well guarded -- means a bug in that guard
makes every paid feature free. A shell on the VM is already full control, so
this adds no attack surface that did not already exist.

Grants are recorded with source='grant', so a comp is distinguishable from a
sale forever after. Never use this to fake a purchase you want in your Stripe
numbers.
"""
import argparse
import sys

from app.repositories.db import cursor
from app.services.entitlements_service import SELLABLE_FEATURES, EntitlementsService


def find_user(email: str) -> str | None:
    """Resolve an email to a user id. Auth lives in GoTrue's auth.users table."""
    with cursor() as cur:
        cur.execute(
            "select id::text as id from auth.users where lower(email) = lower(%s)",
            (email,),
        )
        row = cur.fetchone()
    return row["id"] if row else None


def show(service: EntitlementsService, user_id: str, email: str) -> None:
    features = service.list_features(user_id)
    print(f"{email} ({user_id})")
    print("  owns:", ", ".join(features) if features else "nothing")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="app.admin")
    parser.add_argument("action", choices=["list", "grant", "revoke"])
    parser.add_argument("--email", required=True)
    parser.add_argument(
        "--feature",
        action="append",
        choices=SELLABLE_FEATURES,
        help="repeatable; defaults to the whole pass",
    )
    args = parser.parse_args(argv)

    user_id = find_user(args.email)
    if not user_id:
        print(f"no account for {args.email}", file=sys.stderr)
        return 1

    service = EntitlementsService()
    features = args.feature or list(SELLABLE_FEATURES)

    if args.action == "list":
        show(service, user_id, args.email)
        return 0

    if args.action == "grant":
        for feature in features:
            service.grant(user_id, feature, source="grant", reference=None)
        print(f"granted {', '.join(features)} to {args.email}")
    else:
        with cursor() as cur:
            cur.execute(
                "delete from entitlements where user_id = %s::uuid "
                "and feature = any(%s)",
                (user_id, list(features)),
            )
        print(f"revoked {', '.join(features)} from {args.email}")

    show(service, user_id, args.email)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
