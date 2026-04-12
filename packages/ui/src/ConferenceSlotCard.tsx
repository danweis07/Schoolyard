import { View, Text, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@schoolyard/tokens'

interface ConferenceSlotCardProps {
  startTime: string
  endTime: string
  teacherName: string
  date: string
  location?: string
  isBooked: boolean
  onBook?: () => void
  locale?: string
}

export function ConferenceSlotCard({
  startTime,
  endTime,
  teacherName,
  date,
  location,
  isBooked,
  onBook,
  locale,
}: ConferenceSlotCardProps) {
  const dateStr = new Date(date).toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <View style={[styles.card, isBooked && styles.cardBooked]}>
      <View style={styles.timeRow}>
        <Text style={styles.time}>
          {startTime} – {endTime}
        </Text>
        <Text style={styles.date}>{dateStr}</Text>
      </View>
      <Text style={styles.teacher}>{teacherName}</Text>
      {location ? <Text style={styles.location}>{location}</Text> : null}
      <View style={styles.footer}>
        {isBooked ? (
          <Text style={styles.bookedLabel}>Booked</Text>
        ) : onBook ? (
          <Pressable onPress={onBook} style={styles.bookButton}>
            <Text style={styles.bookButtonText}>Book</Text>
          </Pressable>
        ) : (
          <Text style={styles.availableLabel}>Available</Text>
        )}
      </View>
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
  cardBooked: {
    opacity: 0.6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.color.text.base,
  },
  date: {
    fontSize: 13,
    color: tokens.color.text.muted,
  },
  teacher: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.color.primary,
    marginTop: 6,
  },
  location: {
    fontSize: 13,
    color: tokens.color.text.muted,
    marginTop: 4,
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  bookedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.color.text.muted,
    fontStyle: 'italic',
  },
  availableLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.color.primary,
  },
  bookButton: {
    backgroundColor: tokens.color.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
})
