import { View, Text, StyleSheet } from 'react-native'
import { tokens } from '@schoolyard/tokens'

interface DonationProgressProps {
  raised: number
  goal: number
  label?: string
}

export function DonationProgress({ raised, goal, label }: DonationProgressProps) {
  const percent = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Text style={styles.amount}>
        {formatter.format(raised)}
        <Text style={styles.goal}> of {formatter.format(goal)}</Text>
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.percent}>{percent}% of goal</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: tokens.color.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: 16,
  },
  label: {
    fontSize: 14,
    color: tokens.color.text.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: tokens.color.text.base,
    marginBottom: 12,
  },
  goal: {
    fontSize: 16,
    fontWeight: '500',
    color: tokens.color.text.muted,
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: tokens.color.muted,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: tokens.color.accent,
  },
  percent: {
    marginTop: 8,
    fontSize: 14,
    color: tokens.color.text.muted,
  },
})
