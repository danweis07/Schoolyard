import { ScrollView, View, Text, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { fetchCommunityListings } from '../../lib/manifest'
import { useLocale, useTranslate } from '../../hooks/useLocale'
import { useSchoolConfig } from '../../hooks/useSchoolConfig'
import type { CommunityListing } from '@schoolyard/content-api'

export default function CommunityScreen() {
  const config = useSchoolConfig()
  const locale = useLocale()
  const t = useTranslate(locale)

  const {
    data: listings,
    isLoading,
    error,
  } = useQuery<CommunityListing[]>({
    queryKey: ['communityListings'],
    queryFn: ({ signal }) => fetchCommunityListings(signal),
  })

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <ActivityIndicator />
        <Text className="mt-3 text-muted">{t('common.loading')}</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Text className="text-lg font-semibold">{t('community.title')}</Text>
        <Text className="mt-2 text-center text-muted">{(error as Error).message}</Text>
      </View>
    )
  }

  const visibleListings = (listings ?? []).filter((l) => !l.hidden)

  if (visibleListings.length === 0) {
    return (
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
        <Text className="text-2xl font-bold">{t('community.title')}</Text>
        <Text className="mt-2 text-base text-muted">{t('community.description')}</Text>
        <View className="mt-6 rounded-xl border border-border bg-surface p-4">
          <Text className="text-base text-muted">{t('community.noListings')}</Text>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="mb-4 text-2xl font-bold">{t('community.title')}</Text>
      {visibleListings.map((listing) => (
        <View key={listing.slug} className="mb-3 rounded-xl border border-border bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold">{listing.title}</Text>
            <Text className="rounded bg-muted/10 px-2 py-0.5 text-xs uppercase text-muted">
              {listing.category}
            </Text>
          </View>
          {listing.description ? <Text className="mt-2 text-sm">{listing.description}</Text> : null}
          {listing.neighborhood ? (
            <Text className="mt-1 text-xs text-muted">{listing.neighborhood}</Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  )
}
