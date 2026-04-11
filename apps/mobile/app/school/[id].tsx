import { View, Text, ActivityIndicator } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useFetch } from '../../hooks/useFetch'
import { useLocale, useTranslate } from '../../hooks/useLocale'
import { fetchTenantManifest } from '@schoolyard/content-api'
import { getBaseUrl, hasBaseUrl } from '../../lib/manifest'

/**
 * Per-school detail screen used when the deployment is running in
 * district mode. Fetches the per-school manifest and shows a short
 * summary — the full screens (events, news, etc.) are shared tabs.
 */
export default function SchoolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const locale = useLocale()
  const t = useTranslate(locale)

  const { data, loading, error } = useFetch(
    async (signal) => {
      if (!hasBaseUrl() || !id) return null
      return fetchTenantManifest(getBaseUrl(), id, { signal })
    },
    [id],
  )

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <ActivityIndicator />
        <Text className="mt-3 text-muted">{t('common.loading')}</Text>
      </View>
    )
  }

  if (error || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Text className="text-lg font-semibold">{id}</Text>
        <Text className="mt-2 text-center text-muted">
          {error?.message ?? t('district.noSchools')}
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-surface p-4">
      <Text className="text-2xl font-bold">{data.school.name}</Text>
      {data.school.tagline ? (
        <Text className="mt-1 text-base text-muted">{data.school.tagline}</Text>
      ) : null}
      <Text className="mt-4 text-sm text-muted">
        {data.counts.events} {t('nav.events').toLowerCase()} · {data.counts.news}{' '}
        {t('nav.news').toLowerCase()}
      </Text>
    </View>
  )
}
