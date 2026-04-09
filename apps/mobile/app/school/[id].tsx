import { View, Text } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

export default function SchoolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <View className="flex-1 items-center justify-center bg-surface p-4">
      <Text className="text-2xl font-bold">School: {id}</Text>
      <Text className="mt-2 text-center text-muted">
        Per-school detail screen for the multi-school district view (v2 feature).
      </Text>
    </View>
  )
}
