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
