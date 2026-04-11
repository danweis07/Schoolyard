import { ScrollView, View, Text, ActivityIndicator } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useNews } from '../../hooks/useNews'
import { useLocale, useTranslate } from '../../hooks/useLocale'
import { getNewsBySlug } from '@schoolyard/content-api'

export default function NewsDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const locale = useLocale()
  const t = useTranslate(locale)
  const { data: news, loading, error } = useNews()

  if (loading) {
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
        <Text className="text-center text-muted">{error.message}</Text>
      </View>
    )
  }

  const post = news ? getNewsBySlug(news, slug ?? '') : undefined

  if (!post) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Text className="text-lg font-semibold">{t('errors.notFound')}</Text>
      </View>
    )
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="text-3xl font-bold">{post.title}</Text>
      <Text className="mt-1 text-sm text-muted">
        {dateFormatter.format(new Date(post.publishDate))}
        {post.author ? ` · ${post.author}` : ''}
      </Text>
      <Text className="mt-4 text-base">{post.summary}</Text>
    </ScrollView>
  )
}
