import { ScrollView, View, Text, Switch, ActivityIndicator } from 'react-native'
import { Stack } from 'expo-router'
import { useNotificationPrefs, useUpdateNotificationPrefs } from '../../hooks/useNotificationPrefs'
import { useTranslate } from '../../hooks/useLocale'
import { theme } from '../../lib/theme'
import type { NotificationPrefs } from '../../hooks/useNotificationPrefs'

export default function PreferencesScreen() {
  const t = useTranslate()
  const { data: prefs, isLoading } = useNotificationPrefs()
  const updatePrefs = useUpdateNotificationPrefs()

  function handleChannelToggle(channel: keyof NotificationPrefs['channels'], value: boolean) {
    if (!prefs) return
    updatePrefs.mutate({
      ...prefs,
      channels: { ...prefs.channels, [channel]: value },
    })
  }

  function handleTopicToggle(topicKey: string, value: boolean) {
    if (!prefs) return
    updatePrefs.mutate({
      ...prefs,
      topics: prefs.topics.map((tp) =>
        tp.topic === topicKey ? { ...tp, enabled: value } : tp,
      ),
    })
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('notifications.preferences'),
          headerStyle: { backgroundColor: theme.color.primary },
          headerTintColor: theme.color.text.inverse,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center bg-surface">
          <ActivityIndicator size="large" color={theme.color.primary} />
        </View>
      ) : (
        <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
          {/* Channels section */}
          <Text className="mb-3 text-lg font-bold text-foreground">
            {t('notifications.channels')}
          </Text>
          <Text className="mb-4 text-sm text-muted">
            {t('notifications.channelsDescription')}
          </Text>

          <ChannelRow
            label={t('notifications.pushNotifications')}
            value={prefs?.channels.push ?? false}
            onToggle={(v) => handleChannelToggle('push', v)}
          />
          <ChannelRow
            label={t('notifications.email')}
            value={prefs?.channels.email ?? false}
            onToggle={(v) => handleChannelToggle('email', v)}
          />
          <ChannelRow
            label={t('notifications.sms')}
            value={prefs?.channels.sms ?? false}
            onToggle={(v) => handleChannelToggle('sms', v)}
          />

          {/* Topics section */}
          {prefs?.topics && prefs.topics.length > 0 ? (
            <View className="mt-8">
              <Text className="mb-3 text-lg font-bold text-foreground">
                {t('notifications.topics')}
              </Text>
              <Text className="mb-4 text-sm text-muted">
                {t('notifications.topicsDescription')}
              </Text>

              {prefs.topics.map((topic) => (
                <ChannelRow
                  key={topic.topic}
                  label={topic.label}
                  value={topic.enabled}
                  onToggle={(v) => handleTopicToggle(topic.topic, v)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </>
  )
}

function ChannelRow({
  label,
  value,
  onToggle,
}: {
  label: string
  value: boolean
  onToggle: (value: boolean) => void
}) {
  return (
    <View className="flex-row items-center justify-between border-b border-border py-3">
      <Text className="text-base text-foreground">{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: theme.color.primary, false: '#d1d5db' }}
        accessibilityRole="switch"
        accessibilityLabel={label}
      />
    </View>
  )
}
