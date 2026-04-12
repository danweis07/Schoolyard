import { useQuery } from '@tanstack/react-query'
import { fetchResources } from '../lib/manifest'
import type { ManifestResource } from '@schoolyard/content-api'

export function useResources() {
  return useQuery<ManifestResource[]>({
    queryKey: ['resources'],
    queryFn: ({ signal }) => fetchResources(signal),
  })
}
