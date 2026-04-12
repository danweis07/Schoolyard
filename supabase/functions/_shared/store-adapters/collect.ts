/**
 * Collect adapter — order collection only, no payment processing.
 *
 * Parents place orders online; payment happens at pickup or via a
 * separate arrangement (Venmo, cash, etc.). The simplest adapter.
 */
import type { StoreAdapter, CheckoutRequest, CheckoutResult } from './types.ts'

export function createCollectAdapter(): StoreAdapter {
  return {
    name: 'collect',

    async beginCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
      // Order already created by the edge function. Nothing to do here
      // — the order is immediately complete (status: pending payment at pickup).
      return {
        action: 'complete',
        status: 'pending',
      }
    },
  }
}
