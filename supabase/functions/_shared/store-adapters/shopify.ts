/**
 * Shopify adapter — syncs products from a Shopify Storefront API and
 * redirects checkout to Shopify's hosted checkout.
 *
 * Schools set up their products in Shopify; Schoolyard pulls the catalog
 * via the Storefront API (public, read-only) and displays it. When a
 * parent checks out, they're redirected to Shopify's checkout page.
 *
 * This is the recommended adapter for schools that already have a Shopify
 * store or want print-on-demand via Shopify + Printful/Printify.
 */
import type { StoreAdapter, CheckoutRequest, CheckoutResult, ExternalProduct } from './types.ts'

export interface ShopifyAdapterOptions {
  /** Shopify store domain (e.g. 'my-school.myshopify.com') */
  domain: string
  /** Storefront API access token (public, read-only) */
  storefrontToken: string
}

export function createShopifyAdapter(options: ShopifyAdapterOptions): StoreAdapter {
  const { domain, storefrontToken } = options
  const endpoint = `https://${domain}/api/2024-01/graphql.json`

  async function graphql(query: string, variables?: Record<string, unknown>) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      },
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) throw new Error(`Shopify GraphQL error: ${await res.text()}`)
    return res.json()
  }

  return {
    name: 'shopify',

    async beginCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
      // Create a cart via Storefront API, then get the checkout URL.
      // This requires products to have Shopify variant IDs stored in
      // our spirit_store_products.variants JSONB as { label, external_id }.
      // For now, we build a direct checkout URL using Shopify's /cart/ format.

      // Shopify cart permalink format: /cart/{variant_id}:{quantity},...
      // This works without API calls if we have variant IDs.
      const cartItems = request.items
        .filter((item) => item.variant_label) // need external variant mapping
        .map((item) => `${item.variant_label}:${item.quantity}`)
        .join(',')

      if (cartItems) {
        return {
          action: 'redirect',
          redirect_url: `https://${domain}/cart/${cartItems}`,
          payment_reference: `shopify-cart-${request.order_id}`,
        }
      }

      // Fallback: redirect to the store
      return {
        action: 'redirect',
        redirect_url: `https://${domain}`,
        payment_reference: `shopify-store-${request.order_id}`,
      }
    },

    async syncProducts(_school_id: string): Promise<ExternalProduct[]> {
      const query = `
        {
          products(first: 50) {
            edges {
              node {
                id
                title
                description
                featuredImage { url }
                productType
                variants(first: 20) {
                  edges {
                    node {
                      id
                      title
                      price { amount currencyCode }
                    }
                  }
                }
              }
            }
          }
        }
      `

      const data = await graphql(query)
      const products = data.data?.products?.edges ?? []

      return products.map(
        (edge: {
          node: {
            id: string
            title: string
            description: string
            featuredImage?: { url: string }
            productType: string
            variants: {
              edges: Array<{
                node: {
                  id: string
                  title: string
                  price: { amount: string }
                }
              }>
            }
          }
        }) => {
          const node = edge.node
          const firstVariant = node.variants.edges[0]?.node
          const priceCents = firstVariant
            ? Math.round(parseFloat(firstVariant.price.amount) * 100)
            : 0

          return {
            external_id: node.id,
            name: node.title,
            description: node.description || undefined,
            price_cents: priceCents,
            image_url: node.featuredImage?.url,
            category: node.productType || undefined,
            variants: node.variants.edges.map((ve) => ({
              label: ve.node.title,
              external_id: ve.node.id,
            })),
          }
        },
      )
    },
  }
}
