import { Pressable, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../lib/theme'
import type { InboxItem as InboxItemType } from '../hooks/useInbox'

interface InboxItemProps {
  item: InboxItemType
  onPress: (item: InboxItemType) => void
  onLongPress: (item: InboxItemType) => void
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString()
}

export function InboxItem({ item, onPress, onLongPress }: InboxItemProps) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? '' : 'Unread: '}${item.title}`}
      accessibilityHint="Tap to view details, long press for more options"
      className="flex-row items-start border-b border-border bg-surface px-4 py-3"
    >
      {/* Unread indicator */}
      <View className="mr-3 mt-1.5 items-center justify-center" style={{ width: 10 }}>
        {!item.read ? (
          <View
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: theme.color.primary }}
          />
        ) : null}
      </View>

      {/* Content */}
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className={`flex-1 text-base ${item.read ? 'font-normal text-muted' : 'font-bold text-foreground'}`}
            numberOfLines={1}
          >
            {item.pinned ? (
              <Ionicons name="pin" size={12} color={theme.color.text.muted} />
            ) : null}
            {item.pinned ? ' ' : ''}
            {item.title}
          </Text>

          <View className="ml-2 flex-row items-center">
            {item.urgency === 'urgent' ? (
              <View className="mr-1.5 rounded-full bg-red-600 px-1.5 py-0.5">
                <Text className="text-xs font-semibold text-white">Urgent</Text>
              </View>
            ) : null}
            <Text className="text-xs text-muted">{formatTimestamp(item.timestamp)}</Text>
          </View>
        </View>

        <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
          {item.body}
        </Text>
      </View>
    </Pressable>
  )
}
