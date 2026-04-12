/**
 * Printful adapter — print-on-demand catalog sync + order submission.
 *
 * Schools design their spirit wear in Printful; Schoolyard pulls the
 * catalog and displays it. Orders are submitted to Printful's API for
 * printing and fulfillment. Payment is collected via the school's
 * Stripe/PayPal (Printful charges the school's account, not the buyer).
 *
 * Flow:
 *   1. syncProducts() pulls the school's Printful store catalog
 *   2. beginCheckout() submits the order to Printful for fulfillment
 *   3. Printful handles printing + shipping
 */
import type { StoreAdapter, CheckoutRequest, CheckoutResult, ExternalProduct } from './types.ts'

export interface PrintfulAdapterOptions {
  /** Printful API access token */
  accessToken: string
  /** Printful store ID */
  storeId: string
}

export function createPrintfulAdapter(options: PrintfulAdapterOptions): StoreAdapter {
  const { accessToken, storeId } = options
  const baseUrl = 'https://api.printful.com'

  async function api(path: string, init?: RequestInit) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-PF-Store-Id': storeId,
        ...init?.headers,
      },
    })
    if (!res.ok) throw new Error(`Printful API error: ${await res.text()}`)
    return res.json()
  }

  return {
    name: 'printful',

    async beginCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
      // Submit order to Printful for fulfillment.
      // This requires the school to have a Printful store with the products.
      // The items need to map back to Printful sync variant IDs.
      const printfulItems = request.items.map((item) => ({
        sync_variant_id: item.product_id, // assumes our product_id maps to Printful sync variant
        quantity: item.quantity,
      }))

      const body = {
        recipient: {
          name: request.customer_name,
          email: request.customer_email,
        },
        items: printfulItems,
        // Printful charges the store owner's account for production cost.
        // The school collects retail price from the buyer separately.
      }

      try {
        const data = await api('/orders', {
          method: 'POST',
          body: JSON.stringify(body),
        })

        return {
          action: 'complete',
          status: 'pending',
          payment_reference: `printful-${data.result?.id ?? 'unknown'}`,
        }
      } catch (err) {
        // If Printful submission fails, order still exists locally.
        // Admin can retry or fulfill manually.
        return {
          action: 'complete',
          status: 'pending',
          payment_reference: `printful-failed-${request.order_id}`,
        }
      }
    },

    async syncProducts(_school_id: string): Promise<ExternalProduct[]> {
      const data = await api('/store/products')
      const products = data.result ?? []

      const detailed = await Promise.all(
        products.map(async (p: { id: number }) => {
          const detail = await api(`/store/products/${p.id}`)
          return detail.result
        }),
      )

      return detailed.map(
        (product: {
          sync_product: {
            id: number
            name: string
            thumbnail_url: string
          }
          sync_variants: Array<{
            id: number
            name: string
            retail_price: string
            variant_id: number
          }>
        }) => {
          const firstVariant = product.sync_variants[0]
          const priceCents = firstVariant
            ? Math.round(parseFloat(firstVariant.retail_price) * 100)
            : 0

          return {
            external_id: String(product.sync_product.id),
            name: product.sync_product.name,
            price_cents: priceCents,
            image_url: product.sync_product.thumbnail_url,
            variants: product.sync_variants.map((v) => ({
              label: v.name,
              external_id: String(v.id),
            })),
          }
        },
      )
    },
  }
}
