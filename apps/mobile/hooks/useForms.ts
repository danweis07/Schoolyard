import { useQuery } from '@tanstack/react-query'
import { fetchForms } from '../lib/manifest'
import type { SchoolForm } from '@schoolyard/content-api'

export function useForms() {
  return useQuery<SchoolForm[]>({
    queryKey: ['forms'],
    queryFn: ({ signal }) => fetchForms(signal),
  })
}
