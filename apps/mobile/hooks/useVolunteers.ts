import { useQuery } from '@tanstack/react-query'
import { fetchVolunteers } from '../lib/manifest'
import { useSchoolContext } from '../lib/school-context'
import type { ManifestVolunteerRole } from '@schoolyard/content-api'

export function useVolunteers() {
  const { schoolSlug } = useSchoolContext()
  return useQuery<ManifestVolunteerRole[]>({
    queryKey: ['volunteers', schoolSlug],
    queryFn: ({ signal }) => fetchVolunteers(signal, schoolSlug ?? undefined),
    enabled: !!schoolSlug,
  })
}
