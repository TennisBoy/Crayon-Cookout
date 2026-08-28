/**
 * What is in the shopping basket — the `cc_cart` half of the `cc_*` contract.
 *
 * Physical crayon packs only. Entitlements are a different thing entirely and
 * live in premium.js; the two must not be confused, because one is "what I
 * intend to buy" and the other is "what I already own".
 *
 * On disk the shape is `{ [productId]: quantity }`. Reads fall back to an empty
 * basket on corrupt data, and a single junk line costs you that line rather
 * than the whole basket.
 *
 * Writes swallow their errors the way the other local `cc_*` flags in
 * premium.js do, rather than rejecting. A basket line is re-derivable — you tap
 * the button again — unlike a saved design, which is why designs propagate
 * write failures and this does not.
 */
const KEY = 'cc_cart';

export function getCart() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const clean = {};
    for (const [id, qty] of Object.entries(parsed)) {
      const n = Number(qty);
      if (Number.isInteger(n) && n > 0) clean[id] = n;
    }
    return clean;
  } catch {
    return {};
  }
}

export function getQty(id) {
  return getCart()[id] || 0;
}

/** Total packs across every line — what a header badge would show. */
export function cartCount() {
  return Object.values(getCart()).reduce((total, qty) => total + qty, 0);
}

function write(cart) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event('cc-cart-change'));
  } catch {}
}

/**
 * Set a line outright. Zero (or anything that rounds down to it) removes the
 * line, so walking the stepper down to nothing leaves a clean basket rather
 * than an invisible "0 x Turtle Time 12-pack".
 */
export function setQty(id, qty) {
  const cart = getCart();
  const n = Math.max(0, Math.floor(Number(qty) || 0));
  if (n === 0) {
    delete cart[id];
  } else {
    cart[id] = n;
  }
  write(cart);
}

export function addToCart(id, qty = 1) {
  setQty(id, getQty(id) + qty);
}

export function clearCart() {
  write({});
}
