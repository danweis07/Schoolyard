import { describe, it, expect } from 'vitest'
import { escapeText, formatDateTime, foldLine } from '@/lib/ical'

describe('iCal helpers (RFC 5545)', () => {
  describe('escapeText', () => {
    it('escapes backslashes first (so later escapes are not double-escaped)', () => {
      expect(escapeText('a\\b')).toBe('a\\\\b')
    })

    it('escapes commas', () => {
      expect(escapeText('one, two, three')).toBe('one\\, two\\, three')
    })

    it('escapes semicolons', () => {
      expect(escapeText('key;value')).toBe('key\\;value')
    })

    it('escapes newlines (\\n, \\r, and \\r\\n) to literal \\n', () => {
      expect(escapeText('line1\nline2')).toBe('line1\\nline2')
      expect(escapeText('line1\rline2')).toBe('line1\\nline2')
      expect(escapeText('line1\r\nline2')).toBe('line1\\nline2')
    })

    it('passes plain text through unchanged', () => {
      expect(escapeText('Fall Carnival 2026')).toBe('Fall Carnival 2026')
    })

    it('handles the empty string', () => {
      expect(escapeText('')).toBe('')
    })

    it('combines all escape rules in one pass', () => {
      // Backslash must be escaped before the other rules fire, otherwise
      // e.g. "\," would become "\\\," → "\\\\\\," which is wrong.
      expect(escapeText('a\\b,c;d\ne')).toBe('a\\\\b\\,c\\;d\\ne')
    })
  })

  describe('formatDateTime', () => {
    it('produces a UTC iCal timestamp with zero-padded fields', () => {
      // 2026-01-05 03:04:05 UTC
      const d = new Date(Date.UTC(2026, 0, 5, 3, 4, 5))
      expect(formatDateTime(d)).toBe('20260105T030405Z')
    })

    it('pads month, day, hour, minute, second to 2 digits', () => {
      const d = new Date(Date.UTC(2026, 8, 9, 0, 0, 0))
      expect(formatDateTime(d)).toBe('20260909T000000Z')
    })

    it('always uses UTC regardless of runtime timezone', () => {
      // Explicitly construct in UTC and assert the output matches.
      const d = new Date('2026-12-31T23:59:59.000Z')
      expect(formatDateTime(d)).toBe('20261231T235959Z')
    })

    it('emits exactly the shape YYYYMMDDTHHMMSSZ (15 chars + Z)', () => {
      const d = new Date(Date.UTC(2000, 0, 1, 0, 0, 0))
      const out = formatDateTime(d)
      expect(out).toMatch(/^\d{8}T\d{6}Z$/)
      expect(out.length).toBe(16)
    })
  })

  describe('foldLine', () => {
    it('leaves short lines (<=75 octets) unchanged', () => {
      const short = 'DESCRIPTION:Hello world'
      expect(foldLine(short)).toBe(short)
    })

    it('leaves a line of exactly 75 chars unchanged', () => {
      const line = 'X'.repeat(75)
      expect(foldLine(line)).toBe(line)
    })

    it('folds a 76-char line into 75 + CRLF + space + 1', () => {
      const line = 'X'.repeat(76)
      const folded = foldLine(line)
      expect(folded).toBe('X'.repeat(75) + '\r\n ' + 'X')
    })

    it('folds very long lines into multiple continuation chunks (74 octets each after the first)', () => {
      // 75 + 74 + 74 + 10 = 233 characters, should split into 4 chunks.
      const line = 'X'.repeat(233)
      const folded = foldLine(line)
      const parts = folded.split('\r\n')
      expect(parts.length).toBe(4)
      expect(parts[0]).toBe('X'.repeat(75))
      expect(parts[1]).toBe(' ' + 'X'.repeat(74))
      expect(parts[2]).toBe(' ' + 'X'.repeat(74))
      expect(parts[3]).toBe(' ' + 'X'.repeat(10))
    })

    it('uses CRLF (\\r\\n) as the continuation separator per RFC 5545 §3.1', () => {
      const folded = foldLine('X'.repeat(100))
      expect(folded).toContain('\r\n ')
      // Every LF must be preceded by CR — stripping all CRLFs should leave no bare LFs.
      expect(folded.replaceAll('\r\n', '')).not.toContain('\n')
    })

    it('is reversible: dropping the CRLF + leading space on each continuation yields the original', () => {
      const original = 'DESCRIPTION:' + 'a'.repeat(300)
      const folded = foldLine(original)
      const rejoined = folded
        .split('\r\n')
        .map((chunk, i) => (i === 0 ? chunk : chunk.slice(1)))
        .join('')
      expect(rejoined).toBe(original)
    })
  })
})
