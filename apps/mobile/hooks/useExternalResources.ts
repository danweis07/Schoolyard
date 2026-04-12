import { useQuery } from '@tanstack/react-query'
import {
  fetchExternalResources,
  type ExternalResourcesResult,
  type ResourceCategory,
} from '@schoolyard/content-api'
import { useSchoolConfig } from './useSchoolConfig'
import { getResourceZipCode } from '@schoolyard/config'
import { getBaseUrl } from '../lib/manifest'

export function useExternalResources(category?: ResourceCategory) {
  const config = useSchoolConfig()
  const zipCode = getResourceZipCode(config)
  const gatewayUrl = getBaseUrl()
  const schoolSlug = config.school.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const sources = config.resourcesConfig?.sources ?? ['211']
  const radiusMiles = config.resourcesConfig?.radiusMiles ?? 10

  return useQuery<ExternalResourcesResult>({
    queryKey: ['external-resources', zipCode, category, sources.join(',')],
    queryFn: ({ signal }) =>
      fetchExternalResources({
        gatewayUrl,
        zipCode: zipCode ?? '',
        category,
        sources,
        radiusMiles,
        schoolSlug,
        signal,
      }),
    enabled: !!zipCode && !!gatewayUrl,
    staleTime: 3_600_000, // 1 hour — matches gateway Cache-Control
    gcTime: 86_400_000, // 24 hours — offline persistence
  })
}
