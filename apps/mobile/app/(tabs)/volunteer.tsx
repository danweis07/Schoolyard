import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useVolunteers } from '../../hooks/useVolunteers'
import { useLocale, useTranslate } from '../../hooks/useLocale'

export default function VolunteerScreen() {
  const locale = useLocale()
  const t = useTranslate(locale)
  const router = useRouter()
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
        <Text className="text-lg font-semibold">{t('volunteer.title')}</Text>
        <Text className="mt-2 text-center text-muted">{(error as Error).message}</Text>
      </View>
    )
  }

  const openRoles = (roles ?? []).filter((r) => !r.filled).sort((a, b) => a.order - b.order)

  if (openRoles.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Text className="text-lg font-semibold">{t('volunteer.title')}</Text>
        <Text className="mt-2 text-center text-muted">{t('volunteer.noRoles')}</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="mb-4 text-2xl font-bold">{t('volunteer.openRoles')}</Text>
      {openRoles.map((role) => (
        <Pressable
          key={role.slug}
          onPress={() => router.push(`/volunteer/${role.slug}`)}
          className="mb-3 rounded-xl border border-border bg-surface p-4 active:opacity-80"
        >
          <Text className="text-lg font-bold">{role.title}</Text>
          <Text className="mt-1 text-xs uppercase text-muted">
            {t('volunteer.commitment')}: {role.commitment}
          </Text>
          <Text className="mt-2 text-sm">{role.description}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}
