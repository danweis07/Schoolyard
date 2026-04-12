import { ScrollView, View, Text, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { ConferenceSlotCard } from '@schoolyard/ui'
import { useConferenceWindows, useConferenceSlots } from '../../hooks/useConferences'
import { useLocale, useTranslate } from '../../hooks/useLocale'
import { getSupabase } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

export default function ConferenceDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const locale = useLocale()
  const t = useTranslate(locale)
  const queryClient = useQueryClient()
  const { data: windows, isLoading: loadingWindows } = useConferenceWindows()
  const { data: slots, isLoading: loadingSlots, error } = useConferenceSlots(slug)

  if (loadingWindows || loadingSlots) {
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

  const window = windows?.find((w) => w.slug === slug)

  if (!window) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Text className="text-lg font-semibold">{t('errors.notFound')}</Text>
      </View>
    )
  }

  const handleBook = async (slotId: string) => {
    const supabase = getSupabase()
    if (!supabase) {
      Alert.alert(t('errors.generic'), t('conferences.signInRequired'))
      return
    }

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) {
      Alert.alert(t('errors.generic'), t('conferences.signInRequired'))
      return
    }

    try {
      const gatewayUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
      const res = await fetch(
        `${gatewayUrl}/functions/v1/gateway/user/book-conference`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ slotId }),
        },
      )

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }

      Alert.alert(t('conferences.booked'), t('conferences.bookedMessage'))
      // Refresh slots to reflect the booking
      queryClient.invalidateQueries({ queryKey: ['conferenceSlots', slug] })
    } catch (err) {
      Alert.alert(t('errors.generic'), (err as Error).message)
    }
  }

  // Group slots by teacher
  const slotsByTeacher = new Map<string, typeof slots>()
  for (const slot of slots ?? []) {
    if (!slotsByTeacher.has(slot.teacherName)) {
      slotsByTeacher.set(slot.teacherName, [])
    }
    slotsByTeacher.get(slot.teacherName)!.push(slot)
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="text-2xl font-bold">{window.title}</Text>
      <Text className="mt-1 text-sm text-muted">
        {dateFormatter.format(new Date(window.startsOn))} –{' '}
        {dateFormatter.format(new Date(window.endsOn))}
      </Text>
      {window.description ? (
        <Text className="mt-2 text-sm text-muted">{window.description}</Text>
      ) : null}

      {Array.from(slotsByTeacher.entries()).map(([teacher, teacherSlots]) => (
        <View key={teacher} className="mt-6">
          <Text className="mb-2 text-lg font-bold">{teacher}</Text>
          {teacherSlots!.map((slot) => (
            <ConferenceSlotCard
              key={slot.id}
              startTime={slot.startTime}
              endTime={slot.endTime}
              teacherName={slot.teacherName}
              date={slot.date}
              location={slot.location}
              isBooked={slot.isBooked}
              onBook={() => handleBook(slot.id)}
              locale={locale}
            />
          ))}
        </View>
      ))}

      {(!slots || slots.length === 0) && (
        <Text className="mt-6 text-center text-muted">{t('conferences.noSlots')}</Text>
      )}
    </ScrollView>
  )
}
