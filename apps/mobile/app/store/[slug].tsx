import { View, Text, ScrollView, Pressable, Image } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useSpiritStoreProducts } from '../../hooks/useSpiritStore'
import { useTranslate } from '../../hooks/useLocale'
import { theme } from '../../lib/theme'

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { data: products } = useSpiritStoreProducts()
  const t = useTranslate()
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  const product = products?.find((p) => p.slug === slug)

  if (!product) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400">{t('common.loading')}</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {product.imageUrl && (
        <Image
          source={{ uri: product.imageUrl }}
          className="aspect-square w-full"
          resizeMode="cover"
        />
      )}
      <View className="p-4">
        <Text className="text-2xl font-bold">{product.name}</Text>
        {product.description && (
          <Text className="mt-2 text-base text-gray-600">{product.description}</Text>
        )}
        <Text className="mt-3 text-2xl font-bold" style={{ color: theme.color.primary }}>
          ${(product.priceCents / 100).toFixed(2)}
        </Text>

        {product.variants.length > 0 && (
          <View className="mt-4">
            <Text className="mb-2 text-sm font-semibold">{t('spiritStore.variant')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {product.variants.map((v) => (
                <Pressable
                  key={v.label}
                  onPress={() => setSelectedVariant(v.label)}
                  className={`rounded-lg border px-4 py-2 ${
                    selectedVariant === v.label
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <Text
                    className={
                      selectedVariant === v.label ? 'font-semibold text-blue-700' : 'text-gray-700'
                    }
                  >
                    {v.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View className="mt-4 flex-row items-center gap-4">
          <Text className="text-sm font-semibold">{t('spiritStore.quantity')}</Text>
          <Pressable
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            className="h-8 w-8 items-center justify-center rounded-lg border border-gray-200"
          >
            <Text className="text-lg">−</Text>
          </Pressable>
          <Text className="text-lg font-semibold">{quantity}</Text>
          <Pressable
            onPress={() => setQuantity(quantity + 1)}
            className="h-8 w-8 items-center justify-center rounded-lg border border-gray-200"
          >
            <Text className="text-lg">+</Text>
          </Pressable>
        </View>

        <Pressable
          className="mt-6 items-center rounded-xl py-3"
          style={{ backgroundColor: theme.color.primary }}
        >
          <Text className="text-base font-semibold text-white">{t('spiritStore.addToCart')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
