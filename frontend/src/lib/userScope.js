/**
 * Keeps browser-local state from following one account to another.
 *
 * Everything under `cc_*` lives in localStorage, which belongs to the BROWSER,
 * not to the person signed in. Sign out, sign in as someone else, and without
 * this the second account inherits the first one's basket, collectibles, trial
 * — and, worst of all, its premium flags.
 *
 * The fix is to notice when the identity changes and drop what belonged to the
 * previous one. Server-backed data reappears on its next fetch; genuinely local
 * data is gone, which is correct — it was never this person's.
 */
const USER_KEY = 'cc_user';

// Everything here is per-person. `cc_access_token` and `cc_refresh_token` are
// absent deliberately: the session layer owns those and clears them itself.
const PER_USER_KEYS = [
  'cc_entitlements', // server-backed cache of what was paid for
  'cc_collected', // server-backed cache of collectibles
  'cc_cart', // a basket belongs to whoever filled it
  'cc_trial_expiry', // one free month per person, not per browser
  'cc_trial_used',
  // Legacy premium flags. Nothing writes these any more, but a browser used
  // before entitlements moved server-side may still hold one, and a stale
  // `cc_kitchen=true` would unlock a paid feature for every account here.
  'cc_kitchen',
  'cc_colouring',
  'cc_no_ads',
];

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Reconcile local state with whoever is signed in.
 *
 * Call with the user's id, or null when signed out. Returns true if state was
 * cleared, which is only useful for tests and logging.
 */
export function applyUserScope(userId) {
  const previous = read(USER_KEY);
  const current = userId ?? null;

  // First visit of a signed-out browser: nothing to reconcile, and clearing
  // would throw away a basket built before signing in.
  if (previous === null && current === null) return false;
  if (previous === current) return false;

  // Signing IN from signed-out keeps the basket: it is the same person who
  // filled it a moment ago. Any other transition is a different account.
  const signingIn = previous === null && current !== null;

  try {
    for (const key of PER_USER_KEYS) {
      if (signingIn && key === 'cc_cart') continue;
      localStorage.removeItem(key);
    }
    if (current) localStorage.setItem(USER_KEY, current);
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* private browsing — nothing persisted, so nothing to clear */
  }

  // Repaint anything gated on this state.
  window.dispatchEvent(new Event('cc-premium-change'));
  window.dispatchEvent(new Event('cc-collected-change'));
  window.dispatchEvent(new Event('cc-cart-change'));
  return true;
}
