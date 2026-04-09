import { ScrollView, View, Text } from 'react-native'
import { useSchoolConfig } from '../../hooks/useSchoolConfig'

export default function MoreScreen() {
  const config = useSchoolConfig()

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="text-2xl font-bold">More</Text>

      <View className="mt-6">
        <Text className="text-sm font-semibold uppercase text-muted">School</Text>
        <Text className="mt-2 text-base">{config.school.name}</Text>
        {config.school.address ? (
          <Text className="mt-1 text-sm text-muted">{config.school.address}</Text>
        ) : null}
        {config.school.phone ? (
          <Text className="mt-1 text-sm text-muted">{config.school.phone}</Text>
        ) : null}
      </View>

      <View className="mt-6">
        <Text className="text-sm font-semibold uppercase text-muted">Languages enabled</Text>
        <Text className="mt-2 text-base">{config.languages.supported.join(', ')}</Text>
      </View>

      <View className="mt-12 border-t border-border pt-4">
        <Text className="text-center text-xs text-muted">
          Built with Schoolyard — open source for every school
        </Text>
      </View>
    </ScrollView>
  )
}
