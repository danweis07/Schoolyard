/**
 * Volunteer hours logging form.
 *
 * Auth-gated — unauthenticated users see a sign-in prompt.
 * Writes to `volunteer_hours` via Supabase client with RLS.
 */
import { useState, useCallback } from 'react'
import { View, Text, TextInput, Pressable, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getSupabase } from '../lib/supabase'
import { useSchoolContext } from '../lib/school-context'
import { useTranslate } from '../hooks/useLocale'

interface HoursLogFormProps {
  roleSlug: string
}

export function HoursLogForm({ roleSlug }: HoursLogFormProps) {
  const { schoolSlug } = useSchoolContext()
  const t = useTranslate()
  const router = useRouter()
  const [hours, setHours] = useState('')
  const [servedOn, setServedOn] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase || !schoolSlug) return

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/(auth)/sign-in')
      return
    }

    const hoursNum = parseFloat(hours)
    if (!hoursNum || hoursNum <= 0) {
      Alert.alert('Invalid', 'Please enter a valid number of hours.')
      return
    }

    setLoading(true)

    // Resolve school ID
    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('slug', schoolSlug)
      .maybeSingle<{ id: string }>()

    // Resolve role ID from slug
    const { data: role } = await supabase
      .from('volunteer_roles')
      .select('id')
      .eq('slug', roleSlug)
      .maybeSingle<{ id: string }>()

    if (!school) {
      setLoading(false)
      Alert.alert('Error', 'School not found.')
      return
    }

    const { error } = await (
      supabase.from('volunteer_hours') as unknown as {
        insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
      }
    ).insert({
      school_id: school.id,
      user_id: user.id,
      role_id: role?.id ?? null,
      hours: hoursNum,
      served_on: servedOn,
      notes: notes || null,
    })

    setLoading(false)

    if (error) {
      Alert.alert('Error', error.message)
      return
    }

    setSuccess(true)
    setHours('')
    setNotes('')
  }, [hours, servedOn, notes, roleSlug, schoolSlug, router])

  if (success) {
    return (
      <View className="mt-6 rounded-xl border border-border bg-surface p-4">
        <View className="flex-row items-center gap-2">
          <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          <Text className="text-base font-semibold text-green-600">
            {t('volunteer.hoursRecorded')}
          </Text>
        </View>
        <Pressable onPress={() => setSuccess(false)} className="mt-3">
          <Text className="text-sm text-primary">{t('volunteer.logMore')}</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View className="mt-6 rounded-xl border border-border bg-surface p-4">
      <Text className="text-lg font-bold">{t('volunteer.logHoursTitle')}</Text>
      <Text className="mt-1 text-sm text-muted">{t('volunteer.logHoursDescription')}</Text>

      <View className="mt-4">
        <Text className="text-sm font-semibold">{t('volunteer.servedOn')}</Text>
        <TextInput
          className="mt-1 rounded-lg border border-border bg-white px-3 py-2 text-base"
          value={servedOn}
          onChangeText={setServedOn}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View className="mt-4">
        <Text className="text-sm font-semibold">{t('volunteer.hours')}</Text>
        <TextInput
          className="mt-1 rounded-lg border border-border bg-white px-3 py-2 text-base"
          value={hours}
          onChangeText={setHours}
          placeholder="e.g. 2.5"
          keyboardType="decimal-pad"
        />
      </View>

      <View className="mt-4">
        <Text className="text-sm font-semibold">{t('volunteer.notes')}</Text>
        <TextInput
          className="mt-1 rounded-lg border border-border bg-white px-3 py-2 text-base"
          value={notes}
          onChangeText={setNotes}
          placeholder={t('volunteer.notesPlaceholder')}
          multiline
          numberOfLines={2}
        />
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={loading}
        className={`mt-4 rounded-lg bg-primary px-6 py-3 ${loading ? 'opacity-60' : ''}`}
      >
        <Text className="text-center font-semibold text-white">
          {loading ? t('common.saving') : t('volunteer.logHoursSubmit')}
        </Text>
      </Pressable>
    </View>
  )
}
