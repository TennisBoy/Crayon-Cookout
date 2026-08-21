"""The physical crayon packs, priced on the server.

Mirrors frontend/src/lib/catalog.js. The duplication is deliberate: a price that
arrives from the browser is a price the customer chose. The frontend copy exists
to render a basket; this one decides what a pre-order costs.

Keep the ids in step. `tests/test_catalog_parity.py` fails if they drift.
"""
from dataclasses import dataclass

# Pre-orders are Canada-only for now, so prices are CAD.
CURRENCY = "cad"

# What customers are told before they hand over a card. Shown in the UI and
# recorded on the Stripe session, so the promise and the charge cannot disagree.
DISPATCH_BY = "8 September"


@dataclass(frozen=True)
class Pack:
    id: str
    name: str
    price_cents: int


PACKS: tuple[Pack, ...] = (
    Pack("rainbow-pack", "Rainbow Pack", 899),
    Pack("ocean-bundle", "Ocean Bundle", 749),
    Pack("sunset-set", "Sunset Set", 699),
    Pack("dino-shapes", "Dino Shapes", 999),
    Pack("glitter-pink", "Glitter Pink", 599),
    Pack("classic-7", "Classic 7", 1099),
)

BY_ID = {p.id: p for p in PACKS}

# A basket is a child's shopping list, not an order form. These bound what one
# pre-order can be, so a typo or a stuck button cannot commit someone to 400
# packs.
MAX_PER_PACK = 20
MAX_ITEMS = 60
