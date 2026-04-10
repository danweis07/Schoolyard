import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection, type CollectionEntry } from 'astro:content'
import { siteConfig } from '@/lib/site'
import { escapeText, formatDateTime, foldLine } from '@/lib/ical'
import { isModuleEnabled } from '@schoolyard/config'

/**
 * Per-event iCalendar files. Each event gets a single-VEVENT `.ics` at
 * `/events/<slug>.ics` that families can download to add just that event
 * to their calendar, without subscribing to the whole feed.
 *
 * The combined subscribe-all feed still lives at `/events/calendar.ics`.
 */

interface Props {
  event: CollectionEntry<'events'>
}

export const getStaticPaths: GetStaticPaths = async () => {
  if (!isModuleEnabled(siteConfig, 'events')) return []
  const events = await getCollection('events')
  return events.map((event) => ({
    params: { slug: event.slug },
    props: { event },
  }))
}

export const GET: APIRoute = async ({ props }) => {
  const { event } = props as Props
  const now = new Date()
  const domain = new URL(siteConfig.deployment.siteUrl || 'https://example.org').hostname
  const schoolName = siteConfig.school.name

  const start = event.data.date
  const end = event.data.endDate ?? new Date(start.getTime() + 60 * 60 * 1000)

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Schoolyard//Schoolyard Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(schoolName)}`,
    `X-WR-TIMEZONE:${siteConfig.school.timezone || 'UTC'}`,
    'BEGIN:VEVENT',
    `UID:${event.slug}@${domain}`,
    `DTSTAMP:${formatDateTime(now)}`,
    `DTSTART:${formatDateTime(start)}`,
    `DTEND:${formatDateTime(end)}`,
    `SUMMARY:${escapeText(event.data.title)}`,
    `DESCRIPTION:${escapeText(event.data.description)}`,
  ]
  if (event.data.location) {
    lines.push(`LOCATION:${escapeText(event.data.location)}`)
  }
  if (event.data.registrationUrl) {
    lines.push(`URL:${escapeText(event.data.registrationUrl)}`)
  }
  if (event.data.category) {
    lines.push(`CATEGORIES:${escapeText(event.data.category.toUpperCase())}`)
  }
  if (event.data.cancelled) {
    lines.push('STATUS:CANCELLED')
  }
  lines.push('END:VEVENT', 'END:VCALENDAR')

  const body = lines.map(foldLine).join('\r\n') + '\r\n'

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${event.slug}.ics"`,
    },
  })
}
