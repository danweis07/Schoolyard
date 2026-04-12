import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { FormCard } from '@schoolyard/ui'
import { useForms } from '../../hooks/useForms'
import { useLocale, useTranslate } from '../../hooks/useLocale'

export default function FormsListScreen() {
  const locale = useLocale()
  const t = useTranslate(locale)
  const router = useRouter()
  const { data: forms, isLoading, error } = useForms()

  const published = forms?.filter((f) => f.published) ?? []

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
        <Text className="text-lg font-semibold">{t('forms.title')}</Text>
        <Text className="mt-2 text-center text-muted">{(error as Error).message}</Text>
      </View>
    )
  }

  if (published.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Text className="text-lg font-semibold">{t('forms.title')}</Text>
        <Text className="mt-2 text-center text-muted">{t('forms.noForms')}</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="mb-4 text-2xl font-bold">{t('forms.title')}</Text>
      {published.map((form) => (
        <Pressable key={form.slug} onPress={() => router.push(`/forms/${form.slug}`)}>
          <FormCard
            title={form.title}
            dueDate={form.dueDate}
            completed={false}
          />
        </Pressable>
      ))}
    </ScrollView>
  )
}
