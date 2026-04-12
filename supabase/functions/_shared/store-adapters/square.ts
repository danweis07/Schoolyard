/**
 * Square adapter — creates Square Online Checkout links.
 *
 * Uses the Square Checkout API to generate a hosted checkout URL.
 * Payment confirmation comes via Square webhook (payment.completed).
 */
import type { StoreAdapter, CheckoutRequest, CheckoutResult, PaymentConfirmation } from './types.ts'

export interface SquareAdapterOptions {
  /** Square access token (server-side) */
  accessToken: string
  /** Square location ID */
  locationId: string
}

export function createSquareAdapter(options: SquareAdapterOptions): StoreAdapter {
  const { accessToken, locationId } = options

  return {
    name: 'square',

    async beginCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
      const lineItems = request.items.map((item) => ({
        name: item.variant_label
          ? `${item.product_name} (${item.variant_label})`
          : item.product_name,
        quantity: String(item.quantity),
        base_price_money: {
          amount: item.unit_price_cents,
          currency: 'USD',
        },
      }))

      const idempotencyKey = crypto.randomUUID()

      const body = {
        idempotency_key: idempotencyKey,
        order: {
          location_id: locationId,
          line_items: lineItems,
          metadata: {
            school_id: request.school_id,
            order_id: request.order_id,
            order_type: 'spirit_store',
          },
        },
        checkout_options: {
          redirect_url: request.success_url,
          merchant_support_email: request.customer_email,
        },
        pre_populated_data: {
          buyer_email: request.customer_email,
        },
      }

      const res = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18',
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Square Checkout creation failed: ${text}`)
      }

      const data = (await res.json()) as {
        payment_link: { url: string; id: string }
      }

      return {
        action: 'redirect',
        redirect_url: data.payment_link.url,
        payment_reference: data.payment_link.id,
      }
    },

    async confirmPayment(rawBody: string, _headers: Headers): Promise<PaymentConfirmation | null> {
      const event = JSON.parse(rawBody) as {
        type: string
        data: {
          object: {
            payment: {
              id: string
              order_id: string
            }
          }
        }
      }

      if (event.type !== 'payment.completed') return null

      return {
        order_id: event.data.object.payment.order_id,
        payment_reference: event.data.object.payment.id,
        status: 'paid',
        raw: event,
      }
    },
  }
}
