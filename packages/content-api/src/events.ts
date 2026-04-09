import type { SchoolEvent } from './types.js'

/**
 * Filter helpers for events. Web call sites pass results from
 * Astro's `getCollection('events')`. Mobile call sites will pass
 * results parsed from a JSON manifest (built by a future script).
 */

export function sortByDateAsc(events: SchoolEvent[]): SchoolEvent[] {
  return [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function sortByDateDesc(events: SchoolEvent[]): SchoolEvent[] {
  return [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getUpcomingEvents(events: SchoolEvent[], now: Date = new Date()): SchoolEvent[] {
  return sortByDateAsc(events.filter((e) => !e.cancelled && new Date(e.date) >= now))
}

export function getPastEvents(events: SchoolEvent[], now: Date = new Date()): SchoolEvent[] {
  return sortByDateDesc(events.filter((e) => new Date(e.date) < now))
}

export function getFeaturedEvent(events: SchoolEvent[]): SchoolEvent | undefined {
  const upcoming = getUpcomingEvents(events)
  return upcoming.find((e) => e.featured) ?? upcoming[0]
}
