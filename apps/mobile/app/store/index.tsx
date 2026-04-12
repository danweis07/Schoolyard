import { View, Text, FlatList, Pressable, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { useSpiritStoreProducts } from '../../hooks/useSpiritStore'
import { useTranslate } from '../../hooks/useLocale'
import { theme } from '../../lib/theme'
import type { SpiritStoreProduct } from '@schoolyard/content-api'

export default function StoreScreen() {
  const { data: products, isLoading } = useSpiritStoreProducts()
  const t = useTranslate()
  const router = useRouter()

  const renderProduct = ({ item }: { item: SpiritStoreProduct }) => (
    <Pressable
      onPress={() => router.push(`/store/${item.slug}`)}
      className="mb-4 rounded-xl border border-gray-200 bg-white p-4"
    >
      {item.imageUrl && (
        <Image
          source={{ uri: item.imageUrl }}
          className="mb-3 aspect-square w-full rounded-lg"
          resizeMode="cover"
        />
      )}
      <Text className="text-lg font-bold">{item.name}</Text>
      {item.description && <Text className="mt-1 text-sm text-gray-500">{item.description}</Text>}
      <Text className="mt-2 text-xl font-bold" style={{ color: theme.color.primary }}>
        ${(item.priceCents / 100).toFixed(2)}
      </Text>
      {item.variants.length > 0 && (
        <Text className="mt-1 text-xs text-gray-400">
          {item.variants.map((v) => v.label).join(' · ')}
        </Text>
      )}
    </Pressable>
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
      <FlatList
        data={products ?? []}
        keyExtractor={(item) => item.slug}
        renderItem={renderProduct}
        contentContainerClassName="p-4"
        ListEmptyComponent={
          <Text className="mt-8 text-center text-gray-400">{t('spiritStore.noProducts')}</Text>
        }
      />
    </View>
  )
}
