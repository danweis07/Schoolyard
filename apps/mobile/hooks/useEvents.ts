import { useFetch } from './useFetch'
import { fetchEvents, hasBaseUrl } from '../lib/manifest'
import type { ManifestEvent } from '@schoolyard/content-api'

/**
 * Fetches events from the school's published manifest. Returns an
 * empty list + an error if no site URL is configured — the Events
 * screen handles the empty state gracefully in that case.
 */
export function useEvents() {
  return useFetch<ManifestEvent[]>(async (signal) => {
    if (!hasBaseUrl()) return []
    return fetchEvents(signal)
  })
}
