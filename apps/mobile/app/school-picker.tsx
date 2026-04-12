/**
 * School picker — the first screen a new user sees. Lists all available
 * schools from the Supabase `schools` table and lets the parent tap to
 * select their school. Supports search filtering and groups by district
 * when applicable.
 *
 * Once a school is selected, its slug is persisted to AsyncStorage and
 * the app navigates to the main tabs.
 */
import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getSupabase } from '../lib/supabase'
import { useSchoolContext } from '../lib/school-context'
import type { SchoolInfo } from '@schoolyard/content-api'
import type { SchoolRow } from '@schoolyard/supabase'

export default function SchoolPickerScreen() {
  const router = useRouter()
  const { selectSchool } = useSchoolContext()
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadSchools() {
      const supabase = getSupabase()
      if (!supabase) {
        setError('Supabase is not configured')
        setLoading(false)
        return
      }

      const { data, error: queryError } = await supabase
        .from('schools')
        .select('*')
        .order('name', { ascending: true })
        .returns<SchoolRow[]>()

      if (cancelled) return

      if (queryError) {
        setError(queryError.message)
        setLoading(false)
        return
      }

      setSchools(
        (data ?? []).map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          shortName: row.short_name ?? row.name,
          branding: row.branding,
          modules: row.modules,
          languages: row.languages,
          districtId: row.district_id,
        })),
      )
      setLoading(false)
    }

    loadSchools()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = search.trim()
    ? schools.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : schools

  async function handleSelect(school: SchoolInfo) {
    await selectSchool(school.slug, school)
    router.replace('/(tabs)')
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted">Finding schools...</Text>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface p-4">
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text className="mt-4 text-center text-base font-medium">Unable to load schools</Text>
        <Text className="mt-2 text-center text-sm text-muted">{error}</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="p-4 pb-2">
        <Text className="text-3xl font-bold text-primary">Schoolyard</Text>
        <Text className="mt-1 text-base text-muted">Find your school</Text>

        <View className="mt-4 flex-row items-center rounded-lg border border-border bg-white px-3 py-2">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="ml-2 flex-1 text-base"
            placeholder="Search by school name..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-center text-muted">
            {search.trim() ? 'No schools match your search' : 'No schools available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-4"
          renderItem={({ item }) => {
            const primaryColor = (item.branding.primaryColor as string | undefined) ?? '#1a4f8a'
            return (
              <Pressable
                onPress={() => handleSelect(item)}
                className="mb-2 flex-row items-center rounded-xl border border-border bg-white p-4 active:bg-muted/10"
              >
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Text className="text-lg font-bold text-white">
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold">{item.name}</Text>
                  {item.shortName !== item.name ? (
                    <Text className="text-sm text-muted">{item.shortName}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </Pressable>
            )
          }}
        />
      )}

      <View className="border-t border-border p-4">
        <Text className="text-center text-xs text-muted">
          Built with Schoolyard — open source for every school.
        </Text>
      </View>
    </SafeAreaView>
  )
}
