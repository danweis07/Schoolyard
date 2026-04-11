import { useFetch } from './useFetch'
import { fetchNews, hasBaseUrl } from '../lib/manifest'
import type { ManifestNewsPost } from '@schoolyard/content-api'

export function useNews() {
  return useFetch<ManifestNewsPost[]>(async (signal) => {
    if (!hasBaseUrl()) return []
    return fetchNews(signal)
  })
}
