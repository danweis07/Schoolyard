import { ScrollView, View, Text, ActivityIndicator } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useVolunteers } from '../../hooks/useVolunteers'
import { useLocale, useTranslate } from '../../hooks/useLocale'

export default function VolunteerDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const locale = useLocale()
  const t = useTranslate(locale)
  const { data: roles, isLoading, error } = useVolunteers()

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

  const role = roles?.find((r) => r.slug === slug)

  if (!role) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Text className="text-lg font-semibold">{t('errors.notFound')}</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="text-3xl font-bold">{role.title}</Text>

      <View className="mt-4 flex-row items-center gap-3">
        {role.filled ? (
          <View className="rounded bg-muted/20 px-2 py-1">
            <Text className="text-xs font-bold uppercase text-muted">{t('volunteer.filled')}</Text>
          </View>
        ) : (
          <View className="rounded bg-accent/20 px-2 py-1">
            <Text className="text-xs font-bold uppercase text-accent">{t('volunteer.open')}</Text>
          </View>
        )}
      </View>

      {role.commitment ? (
        <View className="mt-4">
          <Text className="text-sm font-semibold text-muted">{t('volunteer.commitment')}</Text>
          <Text className="mt-1 text-base">{role.commitment}</Text>
        </View>
      ) : null}

      <View className="mt-4">
        <Text className="text-sm font-semibold text-muted">{t('volunteer.description')}</Text>
        <Text className="mt-1 text-base leading-relaxed">{role.description}</Text>
      </View>

      {role.contact ? (
        <View className="mt-6 rounded-xl border border-border bg-surface p-4">
          <Text className="text-sm font-semibold text-muted">{t('volunteer.contact')}</Text>
          <Text className="mt-1 text-base text-primary">{role.contact}</Text>
        </View>
      ) : null}
    </ScrollView>
  )
}
