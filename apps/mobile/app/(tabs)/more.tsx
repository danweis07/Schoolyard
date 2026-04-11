import { ScrollView, View, Text } from 'react-native'
import { useSchoolConfig } from '../../hooks/useSchoolConfig'
import { useLocale, useTranslate } from '../../hooks/useLocale'

export default function MoreScreen() {
  const config = useSchoolConfig()
  const locale = useLocale()
  const t = useTranslate(locale)

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="text-2xl font-bold">{t('common.moreTitle')}</Text>

      <View className="mt-6">
        <Text className="text-sm font-semibold uppercase text-muted">
          {t('common.schoolLabel')}
        </Text>
        <Text className="mt-2 text-base">{config.school.name}</Text>
        {config.school.address ? (
          <Text className="mt-1 text-sm text-muted">{config.school.address}</Text>
        ) : null}
        {config.school.phone ? (
          <Text className="mt-1 text-sm text-muted">{config.school.phone}</Text>
        ) : null}
      </View>

      <View className="mt-6">
        <Text className="text-sm font-semibold uppercase text-muted">
          {t('common.languagesEnabledLabel')}
        </Text>
        <Text className="mt-2 text-base">{config.languages.supported.join(', ')}</Text>
      </View>

      <View className="mt-12 border-t border-border pt-4">
        <Text className="text-center text-xs text-muted">
          {t('footer.builtWith')} Schoolyard — {t('footer.openSourceFor')}
        </Text>
      </View>
    </ScrollView>
  )
}
