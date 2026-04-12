/**
 * Store Adapter Interface
 *
 * Each adapter handles a specific checkout/fulfillment platform.
 * The spirit store is adapter-first: Schoolyard displays the catalog
 * and tracks orders, but delegates checkout to the configured platform.
 *
 * Adapter lifecycle:
 *   1. beginCheckout() — validate items, create checkout on the platform
 *   2. Platform handles payment (hosted checkout, redirect, etc.)
 *   3. confirmPayment() — webhook/callback confirms payment
 *   4. (Optional) syncProducts() — pull catalog from external platform
 */

export interface CheckoutItem {
  product_id: string
  product_name: string
  variant_label?: string
  quantity: number
  unit_price_cents: number
}

export interface CheckoutRequest {
  school_slug: string
  school_id: string
  order_id: string
  items: CheckoutItem[]
  total_cents: number
  customer_name: string
  customer_email: string
  /** Return URL after checkout (success page) */
  success_url: string
  /** Return URL if customer cancels */
  cancel_url: string
}

export interface CheckoutResult {
  /** How the client should handle the result */
  action: 'redirect' | 'confirm' | 'complete'
  /** Redirect URL for hosted checkout (Stripe, Square, PayPal, Shopify) */
  redirect_url?: string
  /** Client secret for client-side confirmation (Stripe Elements) */
  client_secret?: string
  /** Payment reference from the platform */
  payment_reference?: string
  /** Order is immediately complete (collect adapter) */
  status?: string
}

export interface PaymentConfirmation {
  order_id: string
  payment_reference: string
  status: 'paid' | 'failed'
  /** Raw payload from the webhook for audit logging */
  raw?: unknown
}

export interface ExternalProduct {
  external_id: string
  name: string
  description?: string
  price_cents: number
  image_url?: string
  category?: string
  variants: Array<{ label: string; external_id?: string }>
}

export interface StoreAdapter {
  /** Unique adapter name */
  readonly name: string

  /**
   * Initiate checkout on the platform.
   * Returns instructions for the client (redirect URL, client secret, etc.)
   */
  beginCheckout(request: CheckoutRequest): Promise<CheckoutResult>

  /**
   * Process a webhook/callback confirming payment.
   * Returns null if the event is not relevant to this adapter.
   */
  confirmPayment?(rawBody: string, headers: Headers): Promise<PaymentConfirmation | null>

  /**
   * Sync products from the external platform into the local catalog.
   * Only implemented by adapters that manage their own catalog
   * (Shopify, Printful). Returns products to upsert.
   */
  syncProducts?(school_id: string): Promise<ExternalProduct[]>
}
