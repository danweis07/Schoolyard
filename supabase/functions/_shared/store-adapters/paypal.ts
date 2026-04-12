/**
 * PayPal adapter — creates PayPal orders and redirects to hosted checkout.
 *
 * Uses the PayPal Orders API v2 to create an order, then returns the
 * approval URL for the buyer to complete payment on PayPal.
 */
import type { StoreAdapter, CheckoutRequest, CheckoutResult, PaymentConfirmation } from './types.ts'

export interface PayPalAdapterOptions {
  /** PayPal client ID */
  clientId: string
  /** PayPal client secret (server-side) */
  clientSecret: string
  /** Use sandbox or live */
  sandbox?: boolean
}

export function createPayPalAdapter(options: PayPalAdapterOptions): StoreAdapter {
  const { clientId, clientSecret, sandbox = false } = options
  const baseUrl = sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'

  async function getAccessToken(): Promise<string> {
    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })
    if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`)
    const data = (await res.json()) as { access_token: string }
    return data.access_token
  }

  return {
    name: 'paypal',

    async beginCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
      const token = await getAccessToken()

      const items = request.items.map((item) => ({
        name: item.variant_label
          ? `${item.product_name} (${item.variant_label})`
          : item.product_name,
        quantity: String(item.quantity),
        unit_amount: {
          currency_code: 'USD',
          value: (item.unit_price_cents / 100).toFixed(2),
        },
      }))

      const totalValue = (request.total_cents / 100).toFixed(2)

      const body = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: request.order_id,
            description: `Spirit Store Order`,
            amount: {
              currency_code: 'USD',
              value: totalValue,
              breakdown: {
                item_total: { currency_code: 'USD', value: totalValue },
              },
            },
            items,
            custom_id: JSON.stringify({
              school_id: request.school_id,
              order_type: 'spirit_store',
            }),
          },
        ],
        application_context: {
          return_url: request.success_url,
          cancel_url: request.cancel_url,
          brand_name: 'School Spirit Store',
          user_action: 'PAY_NOW',
        },
      }

      const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`PayPal order creation failed: ${text}`)
      }

      const order = (await res.json()) as {
        id: string
        links: Array<{ rel: string; href: string }>
      }

      const approveLink = order.links.find((l) => l.rel === 'approve')
      if (!approveLink) throw new Error('PayPal: no approve link in response')

      return {
        action: 'redirect',
        redirect_url: approveLink.href,
        payment_reference: order.id,
      }
    },

    async confirmPayment(rawBody: string, _headers: Headers): Promise<PaymentConfirmation | null> {
      const event = JSON.parse(rawBody) as {
        event_type: string
        resource: {
          id: string
          purchase_units?: Array<{ reference_id?: string; custom_id?: string }>
        }
      }

      if (event.event_type !== 'CHECKOUT.ORDER.APPROVED') return null

      const unit = event.resource.purchase_units?.[0]
      const orderId = unit?.reference_id
      if (!orderId) return null

      return {
        order_id: orderId,
        payment_reference: event.resource.id,
        status: 'paid',
        raw: event,
      }
    },
  }
}
