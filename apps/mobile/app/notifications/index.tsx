import { FlatList, View, Text, RefreshControl, Alert } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useInbox, useTogglePin, useArchiveItem } from '../../hooks/useInbox'
import { InboxItem } from '../../components/InboxItem'
import { useTranslate } from '../../hooks/useLocale'
import { theme } from '../../lib/theme'
import type { InboxItem as InboxItemType } from '../../hooks/useInbox'

export default function InboxScreen() {
  const t = useTranslate()
  const router = useRouter()
  const { data: items, isLoading, refetch } = useInbox()
  const togglePin = useTogglePin()
  const archiveItem = useArchiveItem()

  const visibleItems = (items ?? []).filter((item) => !item.archived)

  function handlePress(item: InboxItemType) {
    router.push(`/notifications/${item.id}`)
  }

  function handleLongPress(item: InboxItemType) {
    Alert.alert(item.title, undefined, [
      {
        text: item.pinned ? 'Unpin' : 'Pin',
        onPress: () => togglePin.mutate({ id: item.id, pinned: !item.pinned }),
      },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => archiveItem.mutate(item.id),
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('notifications.inbox'),
          headerStyle: { backgroundColor: theme.color.primary },
          headerTintColor: theme.color.text.inverse,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <InboxItem item={item} onPress={handlePress} onLongPress={handleLongPress} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={theme.color.primary}
          />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View className="flex-1 items-center justify-center px-8 py-20">
              <Ionicons
                name="notifications-off-outline"
                size={48}
                color={theme.color.text.muted}
              />
              <Text className="mt-4 text-center text-base text-muted">
                {t('notifications.emptyInbox')}
              </Text>
            </View>
          )
        }
        className="flex-1 bg-surface"
      />
    </>
  )
}
