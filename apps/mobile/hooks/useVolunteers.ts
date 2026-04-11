import { useFetch } from './useFetch'
import { fetchVolunteers, hasBaseUrl } from '../lib/manifest'
import type { ManifestVolunteerRole } from '@schoolyard/content-api'

export function useVolunteers() {
  return useFetch<ManifestVolunteerRole[]>(async (signal) => {
    if (!hasBaseUrl()) return []
    return fetchVolunteers(signal)
  })
}
