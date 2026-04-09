import { View, Text, StyleSheet } from 'react-native'
import { tokens } from '@schoolyard/tokens'
import type { SchoolEvent } from '@schoolyard/content-api'

interface EventCardProps {
  event: SchoolEvent
}

export function EventCard({ event }: EventCardProps) {
  const dateStr = new Date(event.date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <View style={styles.card}>
      <Text style={styles.date}>{dateStr}</Text>
      <Text style={styles.title}>{event.title}</Text>
      {event.location ? <Text style={styles.location}>{event.location}</Text> : null}
      {event.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {event.description}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: 16,
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.color.primary,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.color.text.base,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: tokens.color.text.muted,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: tokens.color.text.base,
    lineHeight: 20,
  },
})
