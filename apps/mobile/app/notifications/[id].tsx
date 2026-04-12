import { useEffect } from 'react'
import { ScrollView, View, Text, Pressable } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useInbox, useMarkAsRead, useTogglePin, useArchiveItem } from '../../hooks/useInbox'
import { useTranslate } from '../../hooks/useLocale'
import { theme } from '../../lib/theme'

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const t = useTranslate()
  const { data: items } = useInbox()
  const markAsRead = useMarkAsRead()
  const togglePin = useTogglePin()
  const archiveItem = useArchiveItem()

  const item = (items ?? []).find((n) => n.id === id)

  // Mark as read when screen opens
  useEffect(() => {
    if (item && !item.read && id) {
      markAsRead.mutate(id)
    }
  }, [id, item?.read])

  if (!item) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: t('notifications.detail'),
            headerStyle: { backgroundColor: theme.color.primary },
            headerTintColor: theme.color.text.inverse,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <View className="flex-1 items-center justify-center bg-surface">
          <Text className="text-muted">{t('notifications.notFound')}</Text>
        </View>
      </>
    )
  }

  const timestamp = new Date(item.timestamp)

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('notifications.detail'),
          headerStyle: { backgroundColor: theme.color.primary },
          headerTintColor: theme.color.text.inverse,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
        {/* Urgency badge */}
        {item.urgency === 'urgent' ? (
          <View className="mb-3 self-start rounded-full bg-red-600 px-3 py-1">
            <Text className="text-sm font-semibold text-white">Urgent</Text>
          </View>
        ) : null}

        {/* Title */}
        <Text className="text-2xl font-bold text-foreground">{item.title}</Text>

        {/* Timestamp */}
        <Text className="mt-1 text-sm text-muted">
          {timestamp.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}{' '}
          {timestamp.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>

        {/* Body */}
        <Text className="mt-4 text-base leading-6 text-foreground">{item.body}</Text>

        {/* Actions */}
        <View className="mt-8 flex-row gap-3">
          <Pressable
            onPress={() => togglePin.mutate({ id: item.id, pinned: !item.pinned })}
            accessibilityRole="button"
            accessibilityLabel={item.pinned ? 'Unpin notification' : 'Pin notification'}
            className="flex-1 flex-row items-center justify-center rounded-lg border border-border bg-surface px-4 py-3"
          >
            <Ionicons
              name={item.pinned ? 'pin' : 'pin-outline'}
              size={18}
              color={theme.color.text.muted}
            />
            <Text className="ml-2 text-sm font-medium text-foreground">
              {item.pinned ? t('notifications.unpin') : t('notifications.pin')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => archiveItem.mutate(item.id)}
            accessibilityRole="button"
            accessibilityLabel="Archive notification"
            className="flex-1 flex-row items-center justify-center rounded-lg border border-border bg-surface px-4 py-3"
          >
            <Ionicons name="archive-outline" size={18} color={theme.color.text.muted} />
            <Text className="ml-2 text-sm font-medium text-foreground">
              {t('notifications.archive')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  )
}
