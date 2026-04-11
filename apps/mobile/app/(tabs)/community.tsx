import { ScrollView, View, Text } from 'react-native'
import { useSchoolConfig } from '../../hooks/useSchoolConfig'
import { useLocale, useTranslate } from '../../hooks/useLocale'

/**
 * Community tab — in v1 the mobile app shows the headline and a link
 * out to the web community board. Full mobile classifieds editing is
 * a v2 feature that would need auth and moderation tooling.
 */
export default function CommunityScreen() {
  const config = useSchoolConfig()
  const locale = useLocale()
  const t = useTranslate(locale)

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="text-2xl font-bold">{t('community.title')}</Text>
      <Text className="mt-2 text-base text-muted">{t('community.description')}</Text>

      <View className="mt-6 rounded-xl border border-border bg-surface p-4">
        <Text className="text-base">
          {t('community.categories.classified')} · {t('community.categories.carpool')} ·{' '}
          {t('community.categories.skill-share')} · {t('community.categories.business')}
        </Text>
      </View>

      {config.deployment.siteUrl ? (
        <Text className="mt-6 text-sm text-muted">{config.deployment.siteUrl}/community</Text>
      ) : null}
    </ScrollView>
  )
}
