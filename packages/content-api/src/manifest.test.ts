import { describe, it, expect, vi } from 'vitest'
import {
  manifestUrl,
  tenantManifestUrl,
  fetchManifest,
  fetchEvents,
  fetchTenantEvents,
  fetchConfig,
} from './manifest.js'
import type { ManifestIndex, ManifestEvent } from './manifest.js'

describe('URL helpers', () => {
  it('builds manifest URLs with a single slash', () => {
    expect(manifestUrl('https://example.org')).toBe('https://example.org/api/manifest.json')
    expect(manifestUrl('https://example.org/')).toBe('https://example.org/api/manifest.json')
    expect(manifestUrl('https://example.org', 'events.json')).toBe(
      'https://example.org/api/events.json',
    )
  })

  it('builds tenant manifest URLs for district mode', () => {
    expect(tenantManifestUrl('https://example.org', 'longfellow')).toBe(
      'https://example.org/api/schools/longfellow/manifest.json',
    )
    expect(tenantManifestUrl('https://example.org/', 'longfellow', 'events.json')).toBe(
      'https://example.org/api/schools/longfellow/events.json',
    )
  })
})

describe('fetch helpers', () => {
  function mockFetch(body: unknown, ok = true, status = 200): typeof fetch {
    return vi.fn(() =>
      Promise.resolve({
        ok,
        status,
        statusText: ok ? 'OK' : 'Error',
        json: () => Promise.resolve(body),
      } as Response),
    ) as unknown as typeof fetch
  }

  it('fetches the root manifest index', async () => {
    const fake: Partial<ManifestIndex> = {
      version: 1,
      tenantMode: 'single',
      tenantSlug: '',
    }
    const fetchImpl = mockFetch(fake)
    const result = await fetchManifest('https://example.org', { fetchImpl })
    expect(result.version).toBe(1)
    expect(result.tenantMode).toBe('single')
  })

  it('fetches events for a single-tenant deployment', async () => {
    const fake: Partial<ManifestEvent>[] = [{ slug: 'fall', title: 'Fall Event' }]
    const fetchImpl = mockFetch(fake)
    const result = await fetchEvents('https://example.org', { fetchImpl })
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('fall')
  })

  it('fetches events for a specific tenant in district mode', async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve([]),
      } as Response),
    ) as unknown as typeof fetch

    await fetchTenantEvents('https://example.org', 'longfellow', { fetchImpl: fetchSpy })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.org/api/schools/longfellow/events.json',
      expect.any(Object),
    )
  })

  it('throws a descriptive error when fetch returns non-OK', async () => {
    const fetchImpl = mockFetch(null, false, 404)
    await expect(fetchConfig('https://example.org', { fetchImpl })).rejects.toThrow(/404/)
  })
})
