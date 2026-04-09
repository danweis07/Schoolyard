import { ScrollView, View, Text } from 'react-native'
import { useSchoolConfig } from '../../hooks/useSchoolConfig'
import { AnnouncementBanner, DonationProgress } from '@schoolyard/ui'
import { isModuleEnabled } from '@schoolyard/config'

export default function HomeScreen() {
  const config = useSchoolConfig()

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="text-3xl font-bold text-primary">{config.school.name}</Text>
      {config.school.tagline ? (
        <Text className="mt-1 text-base text-muted">{config.school.tagline}</Text>
      ) : null}

      <View className="mt-6">
        <AnnouncementBanner
          title="Welcome to Schoolyard"
          message="This is the v1 mobile skeleton. Tabs adapt to which modules your school has enabled."
        />
      </View>

      {isModuleEnabled(config, 'fundraising') && config.fundraising.annualGoal > 0 ? (
        <View className="mt-4">
          <DonationProgress
            raised={config.fundraising.currentRaised}
            goal={config.fundraising.annualGoal}
            label={config.fundraising.goalLabel}
          />
        </View>
      ) : null}

      <Text className="mt-8 text-center text-xs text-muted">
        Schoolyard — open source for every school
      </Text>
    </ScrollView>
  )
}
