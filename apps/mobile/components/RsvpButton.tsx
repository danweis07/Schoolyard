/**
 * RSVP button for event detail screens.
 *
 * Renders three options: Going / Maybe / Can't Make It.
 * Upserts into `event_rsvps` via the Supabase client.
 * Auth-gated — unauthenticated users see a sign-in prompt.
 */
import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getSupabase } from '../lib/supabase'
import { useSchoolContext } from '../lib/school-context'
import { useTranslate } from '../hooks/useLocale'

type RsvpStatus = 'going' | 'maybe' | 'canceled'

interface RsvpButtonProps {
  eventSlug: string
}

export function RsvpButton({ eventSlug }: RsvpButtonProps) {
  const { schoolSlug } = useSchoolContext()
  const t = useTranslate()
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState<RsvpStatus | null>(null)
  const [isAuthed, setIsAuthed] = useState(false)
  const [loading, setLoading] = useState(false)

  // Resolve event slug to event ID and fetch current RSVP
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase || !schoolSlug) return

    let cancelled = false

    async function load() {
      const {
        data: { user },
      } = await supabase!.auth.getUser()
      if (cancelled) return
      setIsAuthed(!!user)
      if (!user) return

      // Resolve event ID from slug
      const { data: event } = await supabase!
        .from('events')
        .select('id')
        .eq('slug', eventSlug)
        .maybeSingle<{ id: string }>()
      if (cancelled || !event) return

      // Fetch current RSVP
      const { data: rsvp } = await supabase!
        .from('event_rsvps')
        .select('status')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle<{ status: RsvpStatus }>()
      if (cancelled) return
      setCurrentStatus(rsvp?.status ?? null)
    }

    load()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => load())

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [eventSlug, schoolSlug])

  const handleRsvp = useCallback(
    async (status: RsvpStatus) => {
      const supabase = getSupabase()
      if (!supabase || !schoolSlug) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/(auth)/sign-in')
        return
      }

      setLoading(true)

      // Resolve IDs
      const { data: school } = await supabase
        .from('schools')
        .select('id')
        .eq('slug', schoolSlug)
        .maybeSingle<{ id: string }>()

      const { data: event } = await supabase
        .from('events')
        .select('id')
        .eq('slug', eventSlug)
        .maybeSingle<{ id: string }>()

      if (!school || !event) {
        setLoading(false)
        return
      }

      const { error } = await (
        supabase.from('event_rsvps') as unknown as {
          upsert: (
            row: Record<string, unknown>,
            opts?: { onConflict?: string },
          ) => Promise<{ error: { message: string } | null }>
        }
      ).upsert(
        {
          event_id: event.id,
          school_id: school.id,
          user_id: user.id,
          status,
          guests: 0,
        },
        { onConflict: 'event_id,user_id' },
      )

      setLoading(false)

      if (error) {
        Alert.alert('Error', error.message)
        return
      }

      setCurrentStatus(status)
    },
    [eventSlug, schoolSlug, router],
  )

  const options: { status: RsvpStatus; label: string; icon: string }[] = [
    { status: 'going', label: t('events.rsvpGoing'), icon: 'checkmark-circle' },
    { status: 'maybe', label: t('events.rsvpMaybe'), icon: 'help-circle' },
    { status: 'canceled', label: t('events.rsvpCanceled'), icon: 'close-circle' },
  ]

  return (
    <View className="mt-6 rounded-xl border border-border bg-surface p-4">
      <Text className="text-sm font-semibold uppercase tracking-wide text-muted">
        {t('events.rsvp')}
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {options.map(({ status, label, icon }) => {
          const isActive = currentStatus === status
          return (
            <Pressable
              key={status}
              onPress={() => handleRsvp(status)}
              disabled={loading}
              className={`flex-row items-center gap-1.5 rounded-lg px-4 py-2.5 ${
                isActive ? 'bg-primary' : 'border border-border bg-surface'
              } ${loading ? 'opacity-60' : ''}`}
            >
              <Ionicons
                name={icon as 'checkmark-circle'}
                size={16}
                color={isActive ? '#ffffff' : '#6b7280'}
              />
              <Text
                className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-foreground'}`}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {!isAuthed ? (
        <Pressable onPress={() => router.push('/(auth)/sign-in')} className="mt-3">
          <Text className="text-xs text-primary">{t('events.rsvpSigninHint')}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
