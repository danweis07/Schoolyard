import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useConferenceWindows } from '../../hooks/useConferences'
import { useLocale, useTranslate } from '../../hooks/useLocale'

export default function ConferencesListScreen() {
  const locale = useLocale()
  const t = useTranslate(locale)
  const router = useRouter()
  const { data: windows, isLoading, error } = useConferenceWindows()

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
        <Text className="text-lg font-semibold">{t('conferences.title')}</Text>
        <Text className="mt-2 text-center text-muted">{(error as Error).message}</Text>
      </View>
    )
  }

  if (!windows || windows.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Text className="text-lg font-semibold">{t('conferences.title')}</Text>
        <Text className="mt-2 text-center text-muted">{t('conferences.noWindows')}</Text>
      </View>
    )
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="mb-4 text-2xl font-bold">{t('conferences.title')}</Text>
      {windows.map((window) => (
        <Pressable
          key={window.slug}
          onPress={() => router.push(`/conferences/${window.slug}`)}
          className="mb-3 rounded-xl border border-border bg-surface p-4 active:bg-muted/10"
        >
          <Text className="text-base font-bold">{window.title}</Text>
          <Text className="mt-1 text-sm text-muted">
            {dateFormatter.format(new Date(window.startsOn))} –{' '}
            {dateFormatter.format(new Date(window.endsOn))}
          </Text>
          {window.description ? (
            <Text className="mt-2 text-sm text-muted" numberOfLines={2}>
              {window.description}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  )
}
