import { useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useResources } from '../../hooks/useResources'
import { useExternalResources } from '../../hooks/useExternalResources'
import { useLocale, useTranslate } from '../../hooks/useLocale'
import { theme } from '../../lib/theme'
import type { ResourceCategory, SchoolResource } from '@schoolyard/content-api'

const CATEGORIES: ResourceCategory[] = [
  'food',
  'health',
  'housing',
  'legal',
  'mental-health',
  'other',
]

function ResourceCard({
  resource,
  t,
}: {
  resource: SchoolResource
  t: (key: string) => string
}) {
  const sourceLabel =
    resource.source === '211'
      ? t('resources.source211')
      : resource.source === 'usda'
        ? t('resources.sourceUsda')
        : resource.source === 'hrsa'
          ? t('resources.sourceHrsa')
          : t('resources.sourceCurated')

  return (
    <View className="mb-3 rounded-xl border border-border bg-surface p-4">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-base font-bold">{resource.name}</Text>
        <View className="rounded bg-primary/10 px-2 py-0.5">
          <Text className="text-xs font-semibold text-primary">{sourceLabel}</Text>
        </View>
      </View>

      {resource.description ? (
        <Text className="mt-2 text-sm text-muted" numberOfLines={3}>
          {resource.description}
        </Text>
      ) : null}

      {resource.address ? (
        <Pressable
          onPress={() =>
            Linking.openURL(
              `https://maps.google.com/?q=${encodeURIComponent(resource.address!)}`,
            )
          }
          className="mt-2 flex-row items-center gap-1"
        >
          <Ionicons name="location-outline" size={14} color={theme.color.text.muted} />
          <Text className="flex-1 text-xs text-muted">{resource.address}</Text>
        </Pressable>
      ) : null}

      {resource.phone ? (
        <Pressable
          onPress={() => Linking.openURL(`tel:${resource.phone}`)}
          className="mt-1 flex-row items-center gap-1"
        >
          <Ionicons name="call-outline" size={14} color={theme.color.primary} />
          <Text className="text-sm font-semibold text-primary">{resource.phone}</Text>
        </Pressable>
      ) : null}

      {(resource.url || resource.externalUrl) ? (
        <Pressable
          onPress={() => Linking.openURL(resource.url ?? resource.externalUrl!)}
          className="mt-2"
        >
          <Text className="text-sm font-semibold text-primary">
            {t('resources.visitWebsite')} →
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export default function ResourcesScreen() {
  const locale = useLocale()
  const t = useTranslate(locale)
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | ''>('')

  const {
    data: curatedResources,
    isLoading: curatedLoading,
  } = useResources()

  const {
    data: externalData,
    isLoading: externalLoading,
    error: externalError,
    refetch: refetchExternal,
  } = useExternalResources()

  const isLoading = curatedLoading || externalLoading

  const curated: SchoolResource[] = (curatedResources ?? []).map((r) => ({
    ...r,
    source: 'curated' as const,
  }))

  const external: SchoolResource[] = externalData?.resources ?? []

  const filteredCurated = activeCategory
    ? curated.filter((r) => r.category === activeCategory)
    : curated

  const filteredExternal = activeCategory
    ? external.filter((r) => r.category === activeCategory)
    : external

  return (
    <>
      <Stack.Screen
        options={{
          title: t('resources.title'),
          headerStyle: { backgroundColor: theme.color.primary },
          headerTintColor: theme.color.text.inverse,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="p-4 pb-12"
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetchExternal()} />
        }
      >
        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pb-2"
        >
          <Pressable
            onPress={() => setActiveCategory('')}
            className={`rounded-full px-4 py-2 ${
              activeCategory === '' ? 'bg-primary' : 'bg-muted/10'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeCategory === '' ? 'text-white' : ''
              }`}
            >
              {t('resources.allCategories')}
            </Text>
          </Pressable>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-2 ${
                activeCategory === cat ? 'bg-primary' : 'bg-muted/10'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  activeCategory === cat ? 'text-white' : ''
                }`}
              >
                {t(`resources.categories.${cat}`)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Curated school resources */}
        {filteredCurated.length > 0 && (
          <View className="mt-4">
            <Text className="mb-3 text-xl font-bold">{t('resources.schoolResources')}</Text>
            {filteredCurated.map((resource) => (
              <ResourceCard key={resource.slug} resource={resource} t={t} />
            ))}
          </View>
        )}

        {/* External community resources */}
        <View className="mt-6">
          <View className="mb-3 flex-row items-center gap-2">
            <Text className="text-xl font-bold">{t('resources.communityResources')}</Text>
            <View className="rounded bg-primary/10 px-2 py-0.5">
              <Text className="text-xs font-semibold text-primary">
                {t('resources.poweredBy211')}
              </Text>
            </View>
          </View>

          {externalLoading && (
            <View className="items-center py-8">
              <ActivityIndicator />
              <Text className="mt-3 text-sm text-muted">
                {t('resources.loadingResources')}
              </Text>
            </View>
          )}

          {externalError && !externalLoading && (
            <View className="items-center py-8">
              <Text className="text-sm text-muted">{t('resources.errorLoading')}</Text>
              <Pressable
                onPress={() => refetchExternal()}
                className="mt-3 rounded-full bg-primary px-6 py-2"
              >
                <Text className="text-sm font-bold text-white">{t('resources.retry')}</Text>
              </Pressable>
            </View>
          )}

          {!externalLoading && !externalError && filteredExternal.length === 0 && (
            <Text className="py-4 text-sm text-muted">
              {t('resources.noExternalResources')}
            </Text>
          )}

          {!externalLoading &&
            filteredExternal.map((resource) => (
              <ResourceCard key={resource.slug} resource={resource} t={t} />
            ))}
        </View>
      </ScrollView>
    </>
  )
}
