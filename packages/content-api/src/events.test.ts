import { describe, it, expect } from 'vitest'
import {
  sortByDateAsc,
  sortByDateDesc,
  getUpcomingEvents,
  getPastEvents,
  getFeaturedEvent,
} from './events.js'
import type { SchoolEvent } from './types.js'

function mkEvent(over: Partial<SchoolEvent>): SchoolEvent {
  return {
    slug: over.slug ?? 'test',
    title: over.title ?? 'Test Event',
    date: over.date ?? '2026-06-01T00:00:00.000Z',
    description: over.description ?? '',
    category: over.category ?? 'other',
    featured: over.featured ?? false,
    cancelled: over.cancelled ?? false,
    ...over,
  }
}

const fixedNow = new Date('2026-06-15T12:00:00.000Z')

describe('sortByDateAsc', () => {
  it('sorts events oldest first', () => {
    const events = [
      mkEvent({ slug: 'c', date: '2026-08-01' }),
      mkEvent({ slug: 'a', date: '2026-01-01' }),
      mkEvent({ slug: 'b', date: '2026-05-01' }),
    ]
    expect(sortByDateAsc(events).map((e) => e.slug)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the input', () => {
    const events = [mkEvent({ slug: 'b', date: '2026-05-01' }), mkEvent({ slug: 'a' })]
    sortByDateAsc(events)
    expect(events[0].slug).toBe('b')
  })
})

describe('sortByDateDesc', () => {
  it('sorts events newest first', () => {
    const events = [
      mkEvent({ slug: 'a', date: '2026-01-01' }),
      mkEvent({ slug: 'c', date: '2026-08-01' }),
      mkEvent({ slug: 'b', date: '2026-05-01' }),
    ]
    expect(sortByDateDesc(events).map((e) => e.slug)).toEqual(['c', 'b', 'a'])
  })
})

describe('getUpcomingEvents', () => {
  it('returns only future events, sorted ascending', () => {
    const events = [
      mkEvent({ slug: 'past', date: '2026-01-01' }),
      mkEvent({ slug: 'far', date: '2026-12-01' }),
      mkEvent({ slug: 'soon', date: '2026-07-01' }),
    ]
    const upcoming = getUpcomingEvents(events, fixedNow)
    expect(upcoming.map((e) => e.slug)).toEqual(['soon', 'far'])
  })

  it('excludes cancelled events', () => {
    const events = [
      mkEvent({ slug: 'live', date: '2026-07-01' }),
      mkEvent({ slug: 'dead', date: '2026-07-02', cancelled: true }),
    ]
    expect(getUpcomingEvents(events, fixedNow).map((e) => e.slug)).toEqual(['live'])
  })

  it('treats events on the current moment as upcoming', () => {
    const events = [mkEvent({ slug: 'now', date: fixedNow.toISOString() })]
    expect(getUpcomingEvents(events, fixedNow)).toHaveLength(1)
  })
})

describe('getPastEvents', () => {
  it('returns only past events, sorted descending', () => {
    const events = [
      mkEvent({ slug: 'old', date: '2026-01-01' }),
      mkEvent({ slug: 'recent', date: '2026-05-01' }),
      mkEvent({ slug: 'future', date: '2026-12-01' }),
    ]
    expect(getPastEvents(events, fixedNow).map((e) => e.slug)).toEqual(['recent', 'old'])
  })

  it('includes cancelled past events (unlike upcoming)', () => {
    const events = [mkEvent({ slug: 'cancelled', date: '2026-01-01', cancelled: true })]
    expect(getPastEvents(events, fixedNow).map((e) => e.slug)).toEqual(['cancelled'])
  })
})

describe('getFeaturedEvent', () => {
  it('returns the featured upcoming event when one exists', () => {
    const events = [
      mkEvent({ slug: 'early', date: '2026-07-01' }),
      mkEvent({ slug: 'starred', date: '2026-08-01', featured: true }),
    ]
    expect(getFeaturedEvent(events, fixedNow)?.slug).toBe('starred')
  })

  it('falls back to the next upcoming event when nothing is featured', () => {
    const events = [
      mkEvent({ slug: 'later', date: '2026-09-01' }),
      mkEvent({ slug: 'sooner', date: '2026-07-01' }),
    ]
    expect(getFeaturedEvent(events, fixedNow)?.slug).toBe('sooner')
  })

  it('returns undefined when there are no upcoming events', () => {
    const events = [mkEvent({ slug: 'past', date: '2026-01-01' })]
    expect(getFeaturedEvent(events, fixedNow)).toBeUndefined()
  })
})
