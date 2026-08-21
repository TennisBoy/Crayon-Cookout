/**
 * Billing adapter.
 *
 * Purchases are a redirect to Stripe's hosted Checkout page: no card details
 * ever reach this app, and no Stripe key is shipped to the browser. The server
 * decides what is for sale and what it costs, so there is nothing to send.
 */
import { api } from '@/lib/api/client'

/** Send the browser to Stripe Checkout. Does not return on success. */
export async function startCheckout(): Promise<void> {
  const { url } = await api.post<{ url: string }>('/billing/checkout')
  window.location.assign(url)
}

export interface PreorderQuote {
  lines: { id: string; name: string; qty: number; price_cents: number; subtotal: number }[]
  total_cents: number
  currency: string
  dispatch_by: string
}

/**
 * Price a basket on the server.
 *
 * The cart can total its own lines, and does, for instant feedback. This is the
 * number a customer is asked to approve, so it comes from the same place that
 * will charge the card.
 */
export async function quotePreorder(basket: Record<string, number>): Promise<PreorderQuote> {
  return api.post<PreorderQuote>('/billing/preorder/quote', { basket })
}

/**
 * Reserve packs. Saves a card and a shipping address; charges nothing today.
 */
export async function startPreorder(basket: Record<string, number>): Promise<void> {
  const { url } = await api.post<{ url: string }>('/billing/preorder', { basket })
  window.location.assign(url)
}
