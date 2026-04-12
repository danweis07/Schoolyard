/**
 * Flag/report button for community listings.
 *
 * Inserts into `community_flags` and calls `increment_listing_flag` RPC.
 * Auth-gated — only signed-in users can flag content.
 */
import { useState, useCallback } from 'react'
import { View, Text, Pressable, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getSupabase } from '../lib/supabase'
import { useSchoolContext } from '../lib/school-context'
import { useTranslate } from '../hooks/useLocale'

interface FlagButtonProps {
  listingSlug: string
}

export function FlagButton({ listingSlug }: FlagButtonProps) {
  const { schoolSlug } = useSchoolContext()
  const t = useTranslate()
  const router = useRouter()
  const [flagged, setFlagged] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleFlag = useCallback(() => {
    const reasons = [
      { text: t('community.flagSpam'), value: 'spam' },
      { text: t('community.flagInappropriate'), value: 'inappropriate' },
      { text: t('community.flagExpired'), value: 'expired' },
      { text: t('common.cancel'), value: null },
    ]

    Alert.alert(t('community.flagTitle'), t('community.flagDescription'), [
      ...reasons.slice(0, -1).map((r) => ({
        text: r.text,
        onPress: () => submitFlag(r.value!),
      })),
      { text: t('common.cancel'), style: 'cancel' as const },
    ])
  }, [listingSlug, schoolSlug, t])

  const submitFlag = useCallback(
    async (reason: string) => {
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

      const { data: listing } = await supabase
        .from('community_listings')
        .select('id')
        .eq('slug', listingSlug)
        .maybeSingle<{ id: string }>()

      if (!school || !listing) {
        setLoading(false)
        return
      }

      // Insert flag
      const { error } = await (
        supabase.from('community_flags') as unknown as {
          insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
        }
      ).insert({
        listing_id: listing.id,
        school_id: school.id,
        reporter_id: user.id,
        reason,
      })

      if (!error) {
        // Increment listing flag count (auto-hides at 3)
        await (
          supabase.rpc as unknown as (
            fn: string,
            params: Record<string, unknown>,
          ) => Promise<unknown>
        )('increment_listing_flag', { p_listing: listing.id })
      }

      setLoading(false)

      if (error) {
        Alert.alert('Error', error.message)
        return
      }

      setFlagged(true)
    },
    [listingSlug, schoolSlug, router],
  )

  if (flagged) {
    return (
      <View className="flex-row items-center gap-1">
        <Ionicons name="flag" size={14} color="#9ca3af" />
        <Text className="text-xs text-muted">{t('community.flagged')}</Text>
      </View>
    )
  }

  return (
    <Pressable
      onPress={handleFlag}
      disabled={loading}
      className="flex-row items-center gap-1 active:opacity-60"
    >
      <Ionicons name="flag-outline" size={14} color="#9ca3af" />
      <Text className="text-xs text-muted">{t('community.report')}</Text>
    </Pressable>
  )
}
