import { View, Text } from 'react-native'

export default function CommunityScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-surface p-4">
      <Text className="text-2xl font-bold">Community</Text>
      <Text className="mt-2 text-center text-muted">
        Classifieds, carpool, and skill share will appear here. v1 is the skeleton.
      </Text>
    </View>
  )
}
