/**
 * The crayon packs we sell.
 *
 * This lives here rather than inside Purchase.jsx because the Cart has to turn
 * a stored basket line back into a name and a price. Copying the price list
 * into a second page is how a basket ends up disagreeing with the shelf it was
 * filled from.
 *
 * Two lists, joined by a slug:
 *
 * - `SETS` is how a pack LOOKS — the colours on the shelf and the emoji. One
 *   entry per design, shared by both sizes of it.
 * - `PRODUCTS` is what is FOR SALE — one line per id, and the id is what a
 *   basket stores. Never display names, so renaming a pack cannot orphan a
 *   basket.
 *
 * Every size of every set is its own id, which is what lets a basket hold two
 * Meow Mix 6-packs and a 12 at the same time. Keep the id/name/price lines
 * literal and one per line: `backend/tests/test_catalog_parity.py` reads this
 * file as text to prove the server charges what the shelf advertises.
 */

/** One entry per design. `slug` is the join key into PRODUCTS. */
export const SETS = [
  { slug: 'meow-mix', name: 'Meow Mix', emoji: '🐱', colors: ['#F59E0B', '#FDE68A', '#9CA3AF', '#78350F'] },
  { slug: 'turtle-time', name: 'Turtle Time', emoji: '🐢', colors: ['#22C55E', '#65A30D', '#14B8A6'] },
  { slug: 'sky-scribbles', name: 'Sky Scribbles', emoji: '☁️', colors: ['#3B82F6', '#38BDF8', '#93C5FD'] },
  { slug: 'petal-party', name: 'Petal Party', emoji: '🌸', colors: ['#EC4899', '#F472B6', '#A855F7', '#FDE68A'] },
  { slug: 'deep-sea-doodles', name: 'Deep Sea Doodles', emoji: '🌊', colors: ['#1E3A8A', '#0891B2', '#14B8A6'] },
  { slug: 'dressed-to-doodle', name: 'Dressed to Doodle', emoji: '👗', colors: ['#EF4444', '#A855F7', '#FACC15', '#EC4899'] },
];

/**
 * Every sellable id. A 12 is two 6s less fifty cents, so it is cheaper by the
 * pack and the shelf says so.
 *
 * `name` is written to carry its own size because it is what the Cart prints
 * AND what goes onto the Stripe pre-order as the packing list — "Meow Mix" on
 * its own would not tell whoever fills the box how many crayons to put in it.
 */
export const PRODUCTS = [
  { id: 'meow-mix-6', name: 'Meow Mix 6-pack', price: 2.99, set: 'meow-mix', count: 6 },
  { id: 'meow-mix-12', name: 'Meow Mix 12-pack', price: 5.49, set: 'meow-mix', count: 12 },
  { id: 'turtle-time-6', name: 'Turtle Time 6-pack', price: 2.99, set: 'turtle-time', count: 6 },
  { id: 'turtle-time-12', name: 'Turtle Time 12-pack', price: 5.49, set: 'turtle-time', count: 12 },
  { id: 'sky-scribbles-6', name: 'Sky Scribbles 6-pack', price: 2.99, set: 'sky-scribbles', count: 6 },
  { id: 'sky-scribbles-12', name: 'Sky Scribbles 12-pack', price: 5.49, set: 'sky-scribbles', count: 12 },
  { id: 'petal-party-6', name: 'Petal Party 6-pack', price: 2.99, set: 'petal-party', count: 6 },
  { id: 'petal-party-12', name: 'Petal Party 12-pack', price: 5.49, set: 'petal-party', count: 12 },
  { id: 'deep-sea-doodles-6', name: 'Deep Sea Doodles 6-pack', price: 2.99, set: 'deep-sea-doodles', count: 6 },
  { id: 'deep-sea-doodles-12', name: 'Deep Sea Doodles 12-pack', price: 5.49, set: 'deep-sea-doodles', count: 12 },
  { id: 'dressed-to-doodle-6', name: 'Dressed to Doodle 6-pack', price: 2.99, set: 'dressed-to-doodle', count: 6 },
  { id: 'dressed-to-doodle-12', name: 'Dressed to Doodle 12-pack', price: 5.49, set: 'dressed-to-doodle', count: 12 },
];

/** What a 12 saves against buying two 6s. Shown on the shelf, in dollars. */
export const BULK_SAVING = 2.99 * 2 - 5.49;

/** The design a product belongs to, or null if the slug is unknown. */
export function findSet(slug) {
  return SETS.find((s) => s.slug === slug) || null;
}

/**
 * Both sizes of one set, cheapest first — one card's worth of shelf.
 */
export function sizesOf(slug) {
  return PRODUCTS.filter((p) => p.set === slug).sort((a, b) => a.count - b.count);
}

/**
 * Resolve a basket line to a product, or null if the id is not one we sell.
 *
 * Returning null matters: a basket saved before a pack was withdrawn still has
 * its id, and the Cart has to be able to skip that line rather than render a
 * blank row or throw.
 *
 * The set's colours are folded in here so that a caller holding a basket line
 * has everything it needs to draw the thing, without knowing there are two
 * lists behind it.
 */
export function findProduct(id) {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return null;
  const set = findSet(product.set);
  return { ...product, colors: set?.colors ?? [], emoji: set?.emoji ?? '' };
}
