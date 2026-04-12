import { useQuery } from '@tanstack/react-query'
import { fetchVolunteers } from '../lib/manifest'
import type { ManifestVolunteerRole } from '@schoolyard/content-api'

export function useVolunteers() {
  return useQuery<ManifestVolunteerRole[]>({
    queryKey: ['volunteers'],
    queryFn: ({ signal }) => fetchVolunteers(signal),
  })
}
