import { View, Text } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

export default function NewsDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()

  return (
    <View className="flex-1 items-center justify-center bg-surface p-4">
      <Text className="text-2xl font-bold">News: {slug}</Text>
      <Text className="mt-2 text-center text-muted">
        Markdown news post detail screen — wired up in a follow-up PR.
      </Text>
    </View>
  )
}
