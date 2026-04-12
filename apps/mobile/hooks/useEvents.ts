import { useQuery } from '@tanstack/react-query'
import { fetchEvents } from '../lib/manifest'
import type { ManifestEvent } from '@schoolyard/content-api'

export function useEvents() {
  return useQuery<ManifestEvent[]>({
    queryKey: ['events'],
    queryFn: ({ signal }) => fetchEvents(signal),
  })
}
