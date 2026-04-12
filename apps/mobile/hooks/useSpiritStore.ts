import { useQuery } from '@tanstack/react-query'
import { fetchSpiritStoreProducts } from '../lib/manifest'
import type { SpiritStoreProduct } from '@schoolyard/content-api'

export function useSpiritStoreProducts() {
  return useQuery<SpiritStoreProduct[]>({
    queryKey: ['spirit-store-products'],
    queryFn: ({ signal }) => fetchSpiritStoreProducts(signal),
  })
}
