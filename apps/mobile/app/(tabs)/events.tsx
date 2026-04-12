import { ScrollView, View, Text, ActivityIndicator } from 'react-native'
import { EventCard } from '@schoolyard/ui'
import { getUpcomingEvents } from '@schoolyard/content-api'
import { useEvents } from '../../hooks/useEvents'
import { useLocale, useTranslate } from '../../hooks/useLocale'

export default function EventsScreen() {
  const locale = useLocale()
  const t = useTranslate(locale)
  const { data: events, isLoading, error } = useEvents()

  const upcoming = events ? getUpcomingEvents(events) : []

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
        <Text className="text-lg font-semibold">{t('events.title')}</Text>
        <Text className="mt-2 text-center text-muted">{(error as Error).message}</Text>
      </View>
    )
  }

  if (upcoming.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Text className="text-lg font-semibold">{t('events.title')}</Text>
        <Text className="mt-2 text-center text-muted">{t('events.noEvents')}</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="mb-4 text-2xl font-bold">{t('events.upcoming')}</Text>
      {upcoming.map((event) => (
        <EventCard key={event.slug} event={event} />
      ))}
    </ScrollView>
  )
}
