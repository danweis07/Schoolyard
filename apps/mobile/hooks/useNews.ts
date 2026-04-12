import { useQuery } from '@tanstack/react-query'
import { fetchNews } from '../lib/manifest'
import type { ManifestNewsPost } from '@schoolyard/content-api'

export function useNews() {
  return useQuery<ManifestNewsPost[]>({
    queryKey: ['news'],
    queryFn: ({ signal }) => fetchNews(signal),
  })
}
