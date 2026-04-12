import { useQuery } from '@tanstack/react-query'
import { fetchNews } from '../lib/manifest'
import { useSchoolContext } from '../lib/school-context'
import type { ManifestNewsPost } from '@schoolyard/content-api'

export function useNews() {
  const { schoolSlug } = useSchoolContext()
  return useQuery<ManifestNewsPost[]>({
    queryKey: ['news', schoolSlug],
    queryFn: ({ signal }) => fetchNews(signal, schoolSlug ?? undefined),
    enabled: !!schoolSlug,
  })
}
