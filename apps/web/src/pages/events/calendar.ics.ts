import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { siteConfig } from '@/lib/site'
import { isModuleEnabled } from '@schoolyard/config'

/**
 * iCalendar feed for the events module.
 *
 * Schools publish the URL `/events/calendar.ics` and families can subscribe
 * in Apple Calendar, Google Calendar, Outlook, etc. Static at build time.
 */

/** Escape a text field per RFC 5545 §3.3.11. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/** Format a Date as iCal UTC timestamp `YYYYMMDDTHHMMSSZ`. */
function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

/** Fold long iCal lines at 75 octets per RFC 5545 §3.1. */
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = []
  let remaining = line
  chunks.push(remaining.slice(0, 75))
  remaining = remaining.slice(75)
  while (remaining.length > 0) {
    chunks.push(' ' + remaining.slice(0, 74))
    remaining = remaining.slice(74)
  }
  return chunks.join('\r\n')
}

export const GET: APIRoute = async () => {
  if (!isModuleEnabled(siteConfig, 'events')) {
    return new Response('Events module disabled', { status: 404 })
  }

  const events = (await getCollection('events')).filter((e) => !e.data.cancelled)
  const now = new Date()
  const domain = new URL(siteConfig.deployment.siteUrl || 'https://example.org').hostname
  const schoolName = siteConfig.school.name

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Schoolyard//Schoolyard Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(schoolName)}`,
    `X-WR-TIMEZONE:${siteConfig.school.timezone || 'UTC'}`,
  ]

  for (const event of events) {
    const start = event.data.date
    const end = event.data.endDate ?? new Date(start.getTime() + 60 * 60 * 1000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.slug}@${domain}`,
      `DTSTAMP:${formatDateTime(now)}`,
      `DTSTART:${formatDateTime(start)}`,
      `DTEND:${formatDateTime(end)}`,
      `SUMMARY:${escapeText(event.data.title)}`,
      `DESCRIPTION:${escapeText(event.data.description)}`,
    )
    if (event.data.location) {
      lines.push(`LOCATION:${escapeText(event.data.location)}`)
    }
    if (event.data.registrationUrl) {
      lines.push(`URL:${escapeText(event.data.registrationUrl)}`)
    }
    if (event.data.category) {
      lines.push(`CATEGORIES:${escapeText(event.data.category.toUpperCase())}`)
    }
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  const body = lines.map(foldLine).join('\r\n') + '\r\n'

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="events.ics"',
    },
  })
}
