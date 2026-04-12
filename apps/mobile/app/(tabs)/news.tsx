import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useNews } from '../../hooks/useNews'
import { useLocale, useTranslate } from '../../hooks/useLocale'

export default function NewsScreen() {
  const locale = useLocale()
  const t = useTranslate(locale)
  const router = useRouter()
  const { data: posts, isLoading, error } = useNews()

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
        <Text className="text-lg font-semibold">{t('news.title')}</Text>
        <Text className="mt-2 text-center text-muted">{(error as Error).message}</Text>
      </View>
    )
  }

  const sortedPosts = [...(posts ?? [])].sort(
    (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime(),
  )

  if (sortedPosts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Text className="text-lg font-semibold">{t('news.title')}</Text>
        <Text className="mt-2 text-center text-muted">{t('news.noNews')}</Text>
      </View>
    )
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="mb-4 text-2xl font-bold">{t('news.latest')}</Text>
      {sortedPosts.map((post) => (
        <Pressable
          key={post.slug}
          onPress={() => router.push(`/news/${post.slug}`)}
          className="mb-3 rounded-xl border border-border bg-surface p-4 active:opacity-80"
        >
          {post.featured ? (
            <Text className="mb-1 text-xs font-bold uppercase text-accent">
              {t('news.featured')}
            </Text>
          ) : null}
          <Text className="text-lg font-bold">{post.title}</Text>
          <Text className="mt-1 text-xs text-muted">
            {dateFormatter.format(new Date(post.publishDate))}
            {post.author ? ` · ${post.author}` : ''}
          </Text>
          {post.summary ? (
            <Text className="mt-2 text-sm text-muted" numberOfLines={2}>
              {post.summary}
            </Text>
          ) : null}
          {post.tags.length > 0 ? (
            <View className="mt-2 flex-row flex-wrap gap-1">
              {post.tags.map((tag) => (
                <Text key={tag} className="rounded bg-muted/10 px-2 py-0.5 text-xs text-muted">
                  {tag}
                </Text>
              ))}
            </View>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  )
}
