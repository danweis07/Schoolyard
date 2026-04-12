/**
 * Store Adapter Factory
 *
 * Resolves the correct store adapter based on the school's spiritStore.provider
 * config. Each adapter handles a different checkout/fulfillment platform.
 *
 * Adapter summary:
 *   collect   — Order collection only (no payment processing)
 *   stripe    — Stripe Checkout Sessions (hosted checkout + webhooks)
 *   square    — Square Online Checkout API (hosted checkout + webhooks)
 *   paypal    — PayPal Orders API v2 (hosted checkout + webhooks)
 *   shopify   — Shopify Storefront API (catalog sync + hosted checkout)
 *   printful  — Printful API (catalog sync + order submission)
 *   external  — Link-out to external store (Bonfire, Custom Ink, etc.)
 */

export type {
  StoreAdapter,
  CheckoutRequest,
  CheckoutResult,
  PaymentConfirmation,
  ExternalProduct,
} from './types.ts'

export { createCollectAdapter } from './collect.ts'
export { createStripeAdapter } from './stripe.ts'
export { createSquareAdapter } from './square.ts'
export { createPayPalAdapter } from './paypal.ts'
export { createShopifyAdapter } from './shopify.ts'
export { createPrintfulAdapter } from './printful.ts'
export { createExternalAdapter } from './external.ts'

import type { StoreAdapter } from './types.ts'
import { createCollectAdapter } from './collect.ts'
import { createStripeAdapter } from './stripe.ts'
import { createSquareAdapter } from './square.ts'
import { createPayPalAdapter } from './paypal.ts'
import { createShopifyAdapter } from './shopify.ts'
import { createPrintfulAdapter } from './printful.ts'
import { createExternalAdapter } from './external.ts'

type ProviderName = 'collect' | 'stripe' | 'square' | 'paypal' | 'shopify' | 'printful' | 'external'

interface AdapterConfig {
  provider: ProviderName
  schoolSlug: string
  // Per-adapter settings (from spiritStore config)
  externalUrl?: string
  externalLabel?: string
  shopifyDomain?: string
  shopifyStorefrontToken?: string
  printfulStoreId?: string
  squareLocationId?: string
}

/**
 * Resolve a Stripe secret key — per-school override or global fallback.
 */
function resolveStripeKey(schoolSlug: string): string | null {
  const slug = schoolSlug.toUpperCase().replace(/-/g, '_')
  return Deno.env.get(`SY_STRIPE_SECRET_${slug}`) ?? Deno.env.get('STRIPE_SECRET_KEY') ?? null
}

/**
 * Resolve a Square access token — per-school override or global fallback.
 */
function resolveSquareToken(schoolSlug: string): string | null {
  const slug = schoolSlug.toUpperCase().replace(/-/g, '_')
  return Deno.env.get(`SY_SQUARE_TOKEN_${slug}`) ?? Deno.env.get('SQUARE_ACCESS_TOKEN') ?? null
}

/**
 * Resolve PayPal credentials — per-school override or global fallback.
 */
function resolvePayPalCredentials(schoolSlug: string) {
  const slug = schoolSlug.toUpperCase().replace(/-/g, '_')
  return {
    clientId: Deno.env.get(`SY_PAYPAL_CLIENT_${slug}`) ?? Deno.env.get('PAYPAL_CLIENT_ID') ?? '',
    clientSecret:
      Deno.env.get(`SY_PAYPAL_SECRET_${slug}`) ?? Deno.env.get('PAYPAL_CLIENT_SECRET') ?? '',
  }
}

/**
 * Resolve Printful access token — per-school override or global fallback.
 */
function resolvePrintfulToken(schoolSlug: string): string | null {
  const slug = schoolSlug.toUpperCase().replace(/-/g, '_')
  return Deno.env.get(`SY_PRINTFUL_TOKEN_${slug}`) ?? Deno.env.get('PRINTFUL_ACCESS_TOKEN') ?? null
}

/**
 * Create the appropriate StoreAdapter for the given school config.
 * Throws if required credentials are missing for the selected provider.
 */
export function resolveAdapter(config: AdapterConfig): StoreAdapter {
  switch (config.provider) {
    case 'collect':
      return createCollectAdapter()

    case 'stripe': {
      const secretKey = resolveStripeKey(config.schoolSlug)
      if (!secretKey) throw new Error('Stripe secret key not configured')
      return createStripeAdapter({ secretKey })
    }

    case 'square': {
      const accessToken = resolveSquareToken(config.schoolSlug)
      if (!accessToken) throw new Error('Square access token not configured')
      if (!config.squareLocationId) throw new Error('Square location ID not configured')
      return createSquareAdapter({ accessToken, locationId: config.squareLocationId })
    }

    case 'paypal': {
      const { clientId, clientSecret } = resolvePayPalCredentials(config.schoolSlug)
      if (!clientId || !clientSecret) throw new Error('PayPal credentials not configured')
      const sandbox = Deno.env.get('PAYPAL_SANDBOX') === 'true'
      return createPayPalAdapter({ clientId, clientSecret, sandbox })
    }

    case 'shopify': {
      if (!config.shopifyDomain || !config.shopifyStorefrontToken) {
        throw new Error('Shopify domain and storefront token required')
      }
      return createShopifyAdapter({
        domain: config.shopifyDomain,
        storefrontToken: config.shopifyStorefrontToken,
      })
    }

    case 'printful': {
      const accessToken = resolvePrintfulToken(config.schoolSlug)
      if (!accessToken) throw new Error('Printful access token not configured')
      if (!config.printfulStoreId) throw new Error('Printful store ID not configured')
      return createPrintfulAdapter({ accessToken, storeId: config.printfulStoreId })
    }

    case 'external': {
      if (!config.externalUrl) throw new Error('External store URL not configured')
      return createExternalAdapter({
        storeUrl: config.externalUrl,
        label: config.externalLabel ?? 'Visit Store',
      })
    }

    default:
      return createCollectAdapter()
  }
}
