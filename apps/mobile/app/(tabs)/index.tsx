import { ScrollView, View, Text } from 'react-native'
import { useSchoolConfig } from '../../hooks/useSchoolConfig'
import { useLocale, useTranslate } from '../../hooks/useLocale'
import { useNews } from '../../hooks/useNews'
import { useEvents } from '../../hooks/useEvents'
import { AnnouncementBanner, DonationProgress } from '@schoolyard/ui'
import { isModuleEnabled } from '@schoolyard/config'
import { getUpcomingEvents } from '@schoolyard/content-api'

export default function HomeScreen() {
  const config = useSchoolConfig()
  const locale = useLocale()
  const t = useTranslate(locale)
  const { data: news } = useNews()
  const { data: events } = useEvents()

  const recentNews = (news ?? []).slice(0, 3)
  const upcomingEvents = events ? getUpcomingEvents(events).slice(0, 3) : []

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="text-3xl font-bold text-primary">{config.school.name}</Text>
      {config.school.tagline ? (
        <Text className="mt-1 text-base text-muted">{config.school.tagline}</Text>
      ) : null}

      <View className="mt-6">
        <AnnouncementBanner
          title={t('common.appIntroTitle', { school: config.school.shortName })}
          message={t('common.appIntroMessage')}
        />
      </View>

      {isModuleEnabled(config, 'fundraising') && config.fundraising.annualGoal > 0 ? (
        <View className="mt-4">
          <DonationProgress
            raised={config.fundraising.currentRaised}
            goal={config.fundraising.annualGoal}
            label={config.fundraising.goalLabel}
            locale={locale}
            labels={{
              of: t('fundraising.of'),
              percentOfGoal: (percent) => t('fundraising.percentRaised', { percent }),
            }}
          />
        </View>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <View className="mt-6">
          <Text className="mb-2 text-lg font-bold">{t('events.upcoming')}</Text>
          {upcomingEvents.map((event) => (
            <View key={event.slug} className="mb-2 rounded-lg border border-border bg-surface p-3">
              <Text className="font-semibold">{event.title}</Text>
              <Text className="text-xs text-muted">{event.date}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {recentNews.length > 0 ? (
        <View className="mt-6">
          <Text className="mb-2 text-lg font-bold">{t('news.latest')}</Text>
          {recentNews.map((post) => (
            <View key={post.slug} className="mb-2 rounded-lg border border-border bg-surface p-3">
              <Text className="font-semibold">{post.title}</Text>
              <Text className="mt-1 text-xs text-muted">{post.summary}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text className="mt-8 text-center text-xs text-muted">
        {t('footer.builtWith')} Schoolyard — {t('footer.openSourceFor')}
      </Text>
    </ScrollView>
  )
}
