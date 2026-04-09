import { View, Text } from 'react-native'

export default function VolunteerScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-surface p-4">
      <Text className="text-2xl font-bold">Volunteer</Text>
      <Text className="mt-2 text-center text-muted">
        Open volunteer roles will appear here. v1 is the skeleton.
      </Text>
    </View>
  )
}
