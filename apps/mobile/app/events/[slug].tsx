import { ScrollView, View, Text, ActivityIndicator } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useEvents } from '../../hooks/useEvents'
import { useLocale, useTranslate } from '../../hooks/useLocale'
import { RsvpButton } from '../../components/RsvpButton'

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const locale = useLocale()
  const t = useTranslate(locale)
  const { data: events, isLoading, error } = useEvents()

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
        <Text className="text-center text-muted">{(error as Error).message}</Text>
      </View>
    )
  }

  const event = events?.find((e) => e.slug === slug)

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Text className="text-lg font-semibold">{t('errors.notFound')}</Text>
      </View>
    )
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      {event.cancelled ? (
        <View className="mb-4 rounded-lg bg-red-100 px-3 py-2">
          <Text className="text-sm font-bold text-red-700">{t('events.cancelled')}</Text>
        </View>
      ) : null}

      {event.featured ? (
        <Text className="mb-2 text-xs font-bold uppercase text-accent">{t('events.featured')}</Text>
      ) : null}

      <Text className="text-3xl font-bold">{event.title}</Text>

      <View className="mt-4 space-y-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-semibold text-muted">{t('events.date')}:</Text>
          <Text className="text-sm">{dateFormatter.format(new Date(event.date))}</Text>
        </View>

        {event.time ? (
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-muted">{t('events.time')}:</Text>
            <Text className="text-sm">{event.time}</Text>
          </View>
        ) : null}

        {event.location ? (
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-muted">{t('events.location')}:</Text>
            <Text className="text-sm">{event.location}</Text>
          </View>
        ) : null}

        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-semibold text-muted">{t('events.category')}:</Text>
          <Text className="rounded bg-muted/10 px-2 py-0.5 text-xs uppercase text-muted">
            {event.category}
          </Text>
        </View>
      </View>

      <Text className="mt-6 text-base leading-relaxed">{event.description}</Text>

      {!event.cancelled ? <RsvpButton eventSlug={event.slug} /> : null}
    </ScrollView>
  )
}
