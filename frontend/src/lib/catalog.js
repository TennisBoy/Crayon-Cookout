/**
 * The crayon packs we sell.
 *
 * This lives here rather than inside Purchase.jsx because the Cart has to turn
 * a stored basket line back into a name and a price. Copying the price list
 * into a second page is how a basket ends up disagreeing with the shelf it was
 * filled from.
 *
 * `id` is the stable key. The basket stores ids, never display names, so
 * renaming a pack cannot orphan someone's basket.
 */
export const PRODUCTS = [
  { id: 'rainbow-pack', name: 'Rainbow Pack', price: 8.99, colors: ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6'] },
  { id: 'ocean-bundle', name: 'Ocean Bundle', price: 7.49, colors: ['#3B82F6', '#06B6D4', '#14B8A6'] },
  { id: 'sunset-set', name: 'Sunset Set', price: 6.99, colors: ['#F97316', '#EF4444', '#FACC15'] },
  { id: 'dino-shapes', name: 'Dino Shapes', price: 9.99, colors: ['#22C55E', '#65A30D', '#14B8A6'] },
  { id: 'glitter-pink', name: 'Glitter Pink', price: 5.99, colors: ['#EC4899', '#FF1493'] },
  { id: 'classic-7', name: 'Classic 7', price: 10.99, colors: ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'] },
];

/**
 * Resolve a basket line to a product, or null if the id is not one we sell.
 *
 * Returning null matters: a basket saved before a pack was withdrawn still has
 * its id, and the Cart has to be able to skip that line rather than render a
 * blank row or throw.
 */
export function findProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}
