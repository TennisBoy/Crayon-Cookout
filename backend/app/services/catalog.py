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


# Every set sells in two sizes, and each size is its own id — that is what lets
# one basket hold two 6-packs of a design and a 12 of it as well. A 12 costs
# fifty cents less than the two 6-packs it replaces.
PACKS: tuple[Pack, ...] = (
    Pack("meow-mix-6", "Meow Mix 6-pack", 299),
    Pack("meow-mix-12", "Meow Mix 12-pack", 549),
    Pack("turtle-time-6", "Turtle Time 6-pack", 299),
    Pack("turtle-time-12", "Turtle Time 12-pack", 549),
    Pack("sky-scribbles-6", "Sky Scribbles 6-pack", 299),
    Pack("sky-scribbles-12", "Sky Scribbles 12-pack", 549),
    Pack("petal-party-6", "Petal Party 6-pack", 299),
    Pack("petal-party-12", "Petal Party 12-pack", 549),
    Pack("deep-sea-doodles-6", "Deep Sea Doodles 6-pack", 299),
    Pack("deep-sea-doodles-12", "Deep Sea Doodles 12-pack", 549),
    Pack("dressed-to-doodle-6", "Dressed to Doodle 6-pack", 299),
    Pack("dressed-to-doodle-12", "Dressed to Doodle 12-pack", 549),
)

BY_ID = {p.id: p for p in PACKS}

# A basket is a child's shopping list, not an order form. These bound what one
# pre-order can be, so a typo or a stuck button cannot commit someone to 400
# packs.
MAX_PER_PACK = 20
MAX_ITEMS = 60
