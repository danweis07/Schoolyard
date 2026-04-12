/**
 * External adapter — link-out to an external store platform.
 *
 * For platforms without public APIs (Bonfire, Custom Ink, SquadLocker,
 * Booster, etc.), this adapter simply redirects the user to the
 * school's external store URL. No order tracking, no catalog sync.
 *
 * This is the simplest integration — Schoolyard shows a branded page
 * with a "Shop on [Platform]" button that links to the external store.
 */
import type { StoreAdapter, CheckoutRequest, CheckoutResult } from './types.ts'

export interface ExternalAdapterOptions {
  /** URL of the external store */
  storeUrl: string
  /** Display label for the button (e.g. "Shop on Bonfire") */
  label: string
}

export function createExternalAdapter(options: ExternalAdapterOptions): StoreAdapter {
  const { storeUrl } = options

  return {
    name: 'external',

    async beginCheckout(_request: CheckoutRequest): Promise<CheckoutResult> {
      return {
        action: 'redirect',
        redirect_url: storeUrl,
      }
    },
  }
}
