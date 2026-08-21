export function hasFeature(feature) {
  try {
    return localStorage.getItem(`cc_${feature}`) === 'true';
  } catch {
    return false;
  }
}

export function setFeature(feature, value = true) {
  try {
    localStorage.setItem(`cc_${feature}`, value ? 'true' : 'false');
    window.dispatchEvent(new Event('cc-premium-change'));
  } catch {}
}

export function isTrialActive() {
  try {
    const expiry = localStorage.getItem('cc_trial_expiry');
    if (!expiry) return false;
    return Date.now() < parseInt(expiry);
  } catch { return false; }
}

export function hasTrialUsed() {
  return hasFeature('trial_used');
}

export function startTrial() {
  try {
    const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem('cc_trial_expiry', String(expiry));
    localStorage.setItem('cc_trial_used', 'true');
    window.dispatchEvent(new Event('cc-premium-change'));
  } catch {}
}

export function getTrialDaysLeft() {
  try {
    const expiry = localStorage.getItem('cc_trial_expiry');
    if (!expiry) return 0;
    const ms = parseInt(expiry) - Date.now();
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  } catch { return 0; }
}

export function hasKitchenAccess() {
  return hasFeature('kitchen') || isTrialActive();
}

export function hasColouringAccess() {
  return hasFeature('colouring') || isTrialActive();
}

export const FREE_COLORS = [
  { name: 'Red', hex: '#EF4444' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Yellow', hex: '#FACC15' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Pink', hex: '#EC4899' },
];

export const LOCKED_COLORS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#1F2937' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Gold', hex: '#FFD700' },
  { name: 'Coral', hex: '#FF7F50' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Lavender', hex: '#C4B5FD' },
  { name: 'Mint', hex: '#86EFAC' },
  { name: 'Peach', hex: '#FFDAB9' },
  { name: 'Sky Blue', hex: '#38BDF8' },
  { name: 'Navy', hex: '#1E3A8A' },
  { name: 'Maroon', hex: '#7F1D1D' },
  { name: 'Olive', hex: '#65A30D' },
  { name: 'Turquoise', hex: '#06B6D4' },
  { name: 'Magenta', hex: '#D946EF' },
  { name: 'Cyan', hex: '#22D3EE' },
  { name: 'Indigo', hex: '#4338CA' },
  { name: 'Crimson', hex: '#B91C1C' },
  { name: 'Salmon', hex: '#FB7185' },
  { name: 'Periwinkle', hex: '#A5B4FC' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Ruby', hex: '#9F1239' },
  { name: 'Sapphire', hex: '#1D4ED8' },
  { name: 'Amethyst', hex: '#7C3AED' },
  { name: 'Topaz', hex: '#EAB308' },
  { name: 'Bronze', hex: '#92400E' },
  { name: 'Platinum', hex: '#D1D5DB' },
  { name: 'Champagne', hex: '#F5DEB3' },
  { name: 'Hot Pink', hex: '#FF1493' },
];

export const SHAPES = {
  crayon: { name: 'Classic Crayon', clipPath: 'polygon(20% 0, 80% 0, 80% 75%, 50% 100%, 20% 75%)', locked: false },
  star: { name: 'Star', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', locked: true },
  heart: { name: 'Heart', clipPath: 'polygon(50% 100%, 0% 42%, 0% 22%, 15% 5%, 35% 5%, 50% 22%, 65% 5%, 85% 5%, 100% 22%, 100% 42%)', locked: true },
  diamond: { name: 'Diamond', clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)', locked: true },
  hexagon: { name: 'Hexagon', clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)', locked: true },
  flower: { name: 'Flower', clipPath: 'polygon(50% 0%, 60% 25%, 85% 15%, 75% 40%, 100% 50%, 75% 60%, 85% 85%, 60% 75%, 50% 100%, 40% 75%, 15% 85%, 25% 60%, 0% 50%, 25% 40%, 15% 15%, 40% 25%)', locked: true },
};