import { useQuery } from '@tanstack/react-query'
import { fetchEvents } from '../lib/manifest'
import { useSchoolContext } from '../lib/school-context'
import type { ManifestEvent } from '@schoolyard/content-api'

export function useEvents() {
  const { schoolSlug } = useSchoolContext()
  return useQuery<ManifestEvent[]>({
    queryKey: ['events', schoolSlug],
    queryFn: ({ signal }) => fetchEvents(signal, schoolSlug ?? undefined),
    enabled: !!schoolSlug,
  })
}
