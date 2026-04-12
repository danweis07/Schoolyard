/**
 * Announcements inbox — shows past push notifications / announcements
 * from the school. Reads from the `announcements` table (public read
 * for sent announcements via RLS).
 */
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useSchoolContext } from '../lib/school-context'
import { useLocale, useTranslate } from '../hooks/useLocale'
import { getSupabase } from '../lib/supabase'
import type { AnnouncementRow } from '@schoolyard/supabase'

export default function AnnouncementsScreen() {
  const { schoolSlug } = useSchoolContext()
  const locale = useLocale()
  const t = useTranslate(locale)

  const { data, isLoading, error } = useQuery({
    queryKey: ['announcements', schoolSlug],
    queryFn: async () => {
      const supabase = getSupabase()
      if (!supabase || !schoolSlug) return []

      // Resolve school ID
      const { data: school } = await supabase
        .from('schools')
        .select('id')
        .eq('slug', schoolSlug)
        .maybeSingle<{ id: string }>()
      if (!school) return []

      const { data: announcements, error: queryError } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', school.id)
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false })
        .returns<AnnouncementRow[]>()

      if (queryError) throw queryError
      return announcements ?? []
    },
    enabled: !!schoolSlug,
  })

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
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

  if (!data || data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Ionicons name="notifications-outline" size={48} color="#9ca3af" />
        <Text className="mt-4 text-lg font-semibold">{t('announcements.empty')}</Text>
        <Text className="mt-2 text-center text-sm text-muted">
          {t('announcements.emptyDescription')}
        </Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="mb-4 text-2xl font-bold">{t('announcements.title')}</Text>
      {data.map((announcement) => (
        <View key={announcement.id} className="mb-3 rounded-xl border border-border bg-surface p-4">
          <View className="flex-row items-start gap-3">
            <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Ionicons name="megaphone" size={16} color="#1a4f8a" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold">{announcement.title}</Text>
              <Text className="mt-1 text-sm leading-relaxed">{announcement.body}</Text>
              {announcement.sent_at ? (
                <Text className="mt-2 text-xs text-muted">
                  {dateFormatter.format(new Date(announcement.sent_at))}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}
