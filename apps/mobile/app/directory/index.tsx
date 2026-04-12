import { View, Text, FlatList, TextInput } from 'react-native'
import { useState, useMemo } from 'react'
import { useDirectory } from '../../hooks/useDirectory'
import { useTranslate } from '../../hooks/useLocale'
import type { DirectoryEntry } from '@schoolyard/content-api'

export default function DirectoryScreen() {
  const { data: entries, isLoading } = useDirectory()
  const t = useTranslate()
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string | null>(null)

  const allGrades = useMemo(() => {
    const grades = new Set<string>()
    for (const entry of entries ?? []) {
      for (const g of entry.studentGrades) {
        grades.add(g)
      }
    }
    return Array.from(grades).sort()
  }, [entries])

  const filtered = useMemo(() => {
    let result = entries ?? []
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (e) =>
          e.familyName.toLowerCase().includes(q) ||
          e.parentNames.some((n) => n.toLowerCase().includes(q)),
      )
    }
    if (gradeFilter) {
      result = result.filter((e) => e.studentGrades.includes(gradeFilter))
    }
    return result
  }, [entries, search, gradeFilter])

  const renderEntry = ({ item }: { item: DirectoryEntry }) => (
    <View className="mb-3 rounded-xl border border-gray-200 bg-white p-4">
      <Text className="text-lg font-bold">{item.familyName}</Text>
      {item.parentNames.length > 0 && (
        <Text className="mt-1 text-sm text-gray-500">{item.parentNames.join(', ')}</Text>
      )}
      {item.studentGrades.length > 0 && (
        <Text className="mt-1 text-xs text-gray-400">Grades: {item.studentGrades.join(', ')}</Text>
      )}
      {item.email && <Text className="mt-2 text-sm text-blue-600">{item.email}</Text>}
      {item.phone && <Text className="mt-1 text-sm text-blue-600">{item.phone}</Text>}
      {item.neighborhood && <Text className="mt-1 text-xs text-gray-400">{item.neighborhood}</Text>}
      {item.notes && <Text className="mt-2 text-sm italic text-gray-500">{item.notes}</Text>}
    </View>
  )

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400">{t('common.loading')}</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="border-b border-gray-200 bg-white px-4 py-3">
        <TextInput
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
          placeholder={t('directory.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
        />
        {allGrades.length > 0 && (
          <FlatList
            horizontal
            data={[null, ...allGrades]}
            keyExtractor={(item) => item ?? 'all'}
            className="mt-2"
            renderItem={({ item }) => (
              <Text
                onPress={() => setGradeFilter(item)}
                className={`mr-2 rounded-full px-3 py-1 text-sm ${
                  gradeFilter === item
                    ? 'bg-blue-100 font-semibold text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {item ?? t('directory.allGrades')}
              </Text>
            )}
          />
        )}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(_, index) => String(index)}
        renderItem={renderEntry}
        contentContainerClassName="p-4"
        ListEmptyComponent={
          <Text className="mt-8 text-center text-gray-400">{t('directory.noEntries')}</Text>
        }
      />
    </View>
  )
}
