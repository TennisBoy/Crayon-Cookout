"""The two catalogs must agree.

The frontend renders a basket from its own list; the server decides what a
pre-order costs. Two lists is the price of not trusting the browser — but if
they drift, a customer sees one price and is charged another.
"""
import re
from pathlib import Path

from app.services.catalog import BY_ID

FRONTEND = (
    Path(__file__).resolve().parents[2] / "frontend" / "src" / "lib" / "catalog.js"
)

PATTERN = re.compile(r"id:\s*'([^']+)'.*?name:\s*'([^']+)'.*?price:\s*([\d.]+)")


def frontend_packs() -> dict[str, tuple[str, int]]:
    text = FRONTEND.read_text(encoding="utf-8")
    packs = {}
    for pack_id, name, price in PATTERN.findall(text):
        packs[pack_id] = (name, round(float(price) * 100))
    return packs


def test_the_frontend_catalog_is_readable():
    assert frontend_packs(), f"parsed nothing from {FRONTEND}"


def test_the_same_packs_are_sold_on_both_sides():
    assert set(frontend_packs()) == set(BY_ID)


def test_names_and_prices_match():
    """A mismatch means the price shown is not the price charged."""
    mismatches = []
    for pack_id, (name, cents) in frontend_packs().items():
        server = BY_ID[pack_id]
        if server.name != name or server.price_cents != cents:
            mismatches.append(
                f"{pack_id}: frontend {name} {cents}c vs server "
                f"{server.name} {server.price_cents}c"
            )
    assert not mismatches, "; ".join(mismatches)
