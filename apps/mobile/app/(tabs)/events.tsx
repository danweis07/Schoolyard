import { View, Text } from 'react-native'

export default function EventsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-surface p-4">
      <Text className="text-2xl font-bold">Events</Text>
      <Text className="mt-2 text-center text-muted">
        Event listings will appear here. v1 is the skeleton — content wiring is on the roadmap.
      </Text>
    </View>
  )
}
