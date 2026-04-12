import { View, Text, StyleSheet } from 'react-native'
import { tokens } from '@schoolyard/tokens'

interface FormCardProps {
  title: string
  dueDate?: string
  completed: boolean
}

export function FormCard({ title, dueDate, completed }: FormCardProps) {
  const dueDateStr = dueDate
    ? new Date(dueDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {completed ? (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>{'\u2713'}</Text>
          </View>
        ) : null}
      </View>
      {dueDateStr ? (
        <Text style={styles.dueDate}>Due {dueDateStr}</Text>
      ) : null}
      {!completed ? (
        <Text style={styles.status}>Not completed</Text>
      ) : (
        <Text style={styles.statusDone}>Completed</Text>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.color.text.base,
    flex: 1,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: tokens.color.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  completedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  dueDate: {
    fontSize: 13,
    color: tokens.color.text.muted,
    marginTop: 6,
  },
  status: {
    fontSize: 12,
    color: tokens.color.text.muted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusDone: {
    fontSize: 12,
    color: tokens.color.primary,
    marginTop: 4,
    fontWeight: '600',
  },
})
