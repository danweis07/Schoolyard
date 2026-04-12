/**
 * Stripe adapter — creates Stripe Checkout Sessions for spirit store orders.
 *
 * Uses the school's Stripe secret key (per-school or global fallback).
 * Payment confirmation comes via the confirm-spirit-payment webhook.
 */
import type { StoreAdapter, CheckoutRequest, CheckoutResult, PaymentConfirmation } from './types.ts'

export interface StripeAdapterOptions {
  /** Stripe secret key (server-side) */
  secretKey: string
}

export function createStripeAdapter(options: StripeAdapterOptions): StoreAdapter {
  const { secretKey } = options

  return {
    name: 'stripe',

    async beginCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
      const lineItems = request.items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.variant_label
              ? `${item.product_name} (${item.variant_label})`
              : item.product_name,
          },
          unit_amount: item.unit_price_cents,
        },
        quantity: item.quantity,
      }))

      const body = new URLSearchParams()
      body.set('mode', 'payment')
      body.set('success_url', request.success_url)
      body.set('cancel_url', request.cancel_url)
      body.set('customer_email', request.customer_email)
      body.set('metadata[school_id]', request.school_id)
      body.set('metadata[order_id]', request.order_id)
      body.set('metadata[order_type]', 'spirit_store')

      lineItems.forEach((li, i) => {
        body.set(`line_items[${i}][price_data][currency]`, li.price_data.currency)
        body.set(
          `line_items[${i}][price_data][product_data][name]`,
          li.price_data.product_data.name,
        )
        body.set(`line_items[${i}][price_data][unit_amount]`, String(li.price_data.unit_amount))
        body.set(`line_items[${i}][quantity]`, String(li.quantity))
      })

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Stripe Checkout Session creation failed: ${text}`)
      }

      const session = (await res.json()) as { id: string; url: string }

      return {
        action: 'redirect',
        redirect_url: session.url,
        payment_reference: session.id,
      }
    },

    async confirmPayment(rawBody: string, headers: Headers): Promise<PaymentConfirmation | null> {
      // Stripe webhook verification is handled by the confirm-spirit-payment
      // edge function. This method is a passthrough for the parsed event.
      const event = JSON.parse(rawBody) as {
        type: string
        data: {
          object: {
            id: string
            metadata: { order_id?: string; order_type?: string }
          }
        }
      }

      if (event.type !== 'checkout.session.completed') return null
      if (event.data.object.metadata.order_type !== 'spirit_store') return null

      const orderId = event.data.object.metadata.order_id
      if (!orderId) return null

      return {
        order_id: orderId,
        payment_reference: event.data.object.id,
        status: 'paid',
        raw: event,
      }
    },
  }
}
