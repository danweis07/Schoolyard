import { ScrollView, View, Text, Pressable, ActivityIndicator, Linking } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useVolunteers } from '../../hooks/useVolunteers'
import { useLocale, useTranslate } from '../../hooks/useLocale'
import { HoursLogForm } from '../../components/HoursLogForm'

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

      {/* Contact coordinator — actionable button */}
      {role.contact ? (
        <Pressable
          onPress={() => Linking.openURL(`mailto:${role.contact}`)}
          className="mt-6 flex-row items-center gap-3 rounded-xl border border-border bg-surface p-4 active:bg-muted/10"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
            <Ionicons name="mail" size={20} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold">{t('volunteer.contactCoordinator')}</Text>
            <Text className="text-sm text-primary">{role.contact}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </Pressable>
      ) : null}

      {/* Sign up button for open roles */}
      {!role.filled && role.contact ? (
        <Pressable
          onPress={() => {
            const subject = encodeURIComponent(`Volunteer: ${role.title}`)
            const body = encodeURIComponent(
              `Hi, I'd like to sign up for the "${role.title}" volunteer role.`,
            )
            Linking.openURL(`mailto:${role.contact}?subject=${subject}&body=${body}`)
          }}
          className="mt-3 rounded-lg bg-primary px-6 py-3"
        >
          <Text className="text-center font-semibold text-white">{t('volunteer.signUp')}</Text>
        </Pressable>
      ) : null}

      {/* Hours logging form */}
      <HoursLogForm roleSlug={slug} />
    </ScrollView>
  )
}
