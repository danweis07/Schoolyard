import { View, Text, StyleSheet } from 'react-native'
import { tokens } from '@schoolyard/tokens'

interface AnnouncementBannerProps {
  title: string
  message: string
}

export function AnnouncementBanner({ title, message }: AnnouncementBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: tokens.color.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    color: tokens.color.text.inverse,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    color: tokens.color.text.inverse,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.95,
  },
})
