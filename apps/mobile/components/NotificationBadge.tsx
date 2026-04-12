import { Pressable, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useUnreadCount } from '../hooks/useUnreadCount'

interface NotificationBadgeProps {
  color: string
  size?: number
  onPress: () => void
}

/**
 * Bell icon with a red unread-count badge. Renders nothing for the badge
 * portion when count is 0. Designed for use in header navigation.
 */
export function NotificationBadge({ color, size = 24, onPress }: NotificationBadgeProps) {
  const { data: count } = useUnreadCount()
  const displayCount = count ?? 0

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        displayCount > 0
          ? `Notifications, ${displayCount} unread`
          : 'Notifications'
      }
      hitSlop={8}
      className="mr-3"
    >
      <Ionicons name="notifications-outline" size={size} color={color} />
      {displayCount > 0 ? (
        <View
          className="absolute -right-1.5 -top-1 items-center justify-center rounded-full bg-red-600"
          style={{
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
          }}
        >
          <Text className="text-center text-xs font-bold text-white">
            {displayCount > 99 ? '99+' : displayCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  )
}
