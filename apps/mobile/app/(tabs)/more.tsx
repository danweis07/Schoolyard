import { useState, useEffect } from 'react'
import { ScrollView, View, Text, Pressable, Alert, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { useSchoolConfig } from '../../hooks/useSchoolConfig'
import { useLocale, useTranslate } from '../../hooks/useLocale'
import { useSchoolContext } from '../../lib/school-context'
import { clearClientCache } from '../../lib/manifest'
import { getSupabase } from '../../lib/supabase'

export default function MoreScreen() {
  const config = useSchoolConfig()
  const locale = useLocale()
  const t = useTranslate(locale)
  const router = useRouter()
  const { clearSchool } = useSchoolContext()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = () => {
    const supabase = getSupabase()
    if (!supabase) return
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          setUserEmail(null)
        },
      },
    ])
  }

  const handleChangeSchool = () => {
    Alert.alert('Change School', 'Switch to a different school?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Change',
        onPress: async () => {
          clearClientCache()
          await clearSchool()
        },
      },
    ])
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="text-2xl font-bold">{t('common.moreTitle')}</Text>

      {/* Account section */}
      <View className="mt-6 rounded-xl border border-border bg-surface">
        <View className="border-b border-border px-4 py-3">
          <Text className="text-xs font-semibold uppercase text-muted">Account</Text>
        </View>
        {userEmail ? (
          <>
            <View className="flex-row items-center justify-between px-4 py-3">
              <Text className="text-sm font-medium">Signed in as</Text>
              <Text className="text-sm text-muted">{userEmail}</Text>
            </View>
            <Pressable
              onPress={handleSignOut}
              className="border-t border-border px-4 py-3 active:bg-muted/10"
            >
              <Text className="text-sm font-medium text-red-600">Sign out</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => router.push('/(auth)/sign-in')}
            className="px-4 py-3 active:bg-muted/10"
          >
            <Text className="text-sm font-medium text-primary">Sign in</Text>
          </Pressable>
        )}
      </View>

      {/* School info */}
      <View className="mt-4 rounded-xl border border-border bg-surface">
        <View className="border-b border-border px-4 py-3">
          <Text className="text-xs font-semibold uppercase text-muted">
            {t('common.schoolLabel')}
          </Text>
        </View>
        <View className="px-4 py-3">
          <Text className="text-base font-medium">{config.school.name}</Text>
          {config.school.district ? (
            <Text className="mt-1 text-sm text-muted">{config.school.district}</Text>
          ) : null}
          {config.school.address ? (
            <Text className="mt-1 text-sm text-muted">{config.school.address}</Text>
          ) : null}
          {config.school.phone ? (
            <Pressable onPress={() => Linking.openURL(`tel:${config.school.phone}`)}>
              <Text className="mt-1 text-sm text-primary">{config.school.phone}</Text>
            </Pressable>
          ) : null}
          {config.school.email ? (
            <Pressable onPress={() => Linking.openURL(`mailto:${config.school.email}`)}>
              <Text className="mt-1 text-sm text-primary">{config.school.email}</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={handleChangeSchool}
          className="border-t border-border px-4 py-3 active:bg-muted/10"
        >
          <Text className="text-sm font-medium text-primary">Change school</Text>
        </Pressable>
      </View>

      {/* Links */}
      <View className="mt-4 rounded-xl border border-border bg-surface">
        <View className="border-b border-border px-4 py-3">
          <Text className="text-xs font-semibold uppercase text-muted">Links</Text>
        </View>
        {config.deployment.siteUrl ? (
          <Pressable
            onPress={() => Linking.openURL(config.deployment.siteUrl)}
            className="border-b border-border px-4 py-3 active:bg-muted/10"
          >
            <Text className="text-sm font-medium">School website</Text>
            <Text className="text-xs text-muted">{config.deployment.siteUrl}</Text>
          </Pressable>
        ) : null}
        {config.social?.facebook ? (
          <Pressable
            onPress={() => Linking.openURL(config.social.facebook)}
            className="border-b border-border px-4 py-3 active:bg-muted/10"
          >
            <Text className="text-sm font-medium">Facebook</Text>
          </Pressable>
        ) : null}
        {config.social?.instagram ? (
          <Pressable
            onPress={() => Linking.openURL(config.social.instagram)}
            className="px-4 py-3 active:bg-muted/10"
          >
            <Text className="text-sm font-medium">Instagram</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Languages */}
      <View className="mt-4 rounded-xl border border-border bg-surface">
        <View className="border-b border-border px-4 py-3">
          <Text className="text-xs font-semibold uppercase text-muted">
            {t('common.languagesEnabledLabel')}
          </Text>
        </View>
        <View className="px-4 py-3">
          <Text className="text-sm">{config.languages.supported.join(', ')}</Text>
        </View>
      </View>

      {/* Footer */}
      <View className="mt-8 border-t border-border pt-4">
        <Text className="text-center text-xs text-muted">
          {t('footer.builtWith')} Schoolyard — {t('footer.openSourceFor')}
        </Text>
        <Text className="mt-1 text-center text-xs text-muted">v0.1.0</Text>
      </View>
    </ScrollView>
  )
}
