import { View, Text } from 'react-native'
import { useSchoolConfig } from '../hooks/useSchoolConfig'

export function SchoolHeader() {
  const config = useSchoolConfig()
  return (
    <View className="bg-primary px-4 py-3">
      <Text className="text-lg font-bold text-inverse">{config.school.shortName}</Text>
    </View>
  )
}
