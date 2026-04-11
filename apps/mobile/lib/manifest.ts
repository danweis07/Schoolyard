/**
 * Mobile-side wrapper around the content manifest fetch helpers.
 *
 * The base URL comes from `siteConfig.deployment.siteUrl` — the school's
 * published website, which serves `api/*.json` alongside the HTML. In
 * development you can override via the EXPO_PUBLIC_MANIFEST_BASE_URL env var.
 */
import { siteConfig } from './config'
import {
  fetchManifest as apiFetchManifest,
  fetchEvents as apiFetchEvents,
  fetchNews as apiFetchNews,
  fetchBoard as apiFetchBoard,
  fetchVolunteers as apiFetchVolunteers,
  fetchResources as apiFetchResources,
} from '@schoolyard/content-api'
import type {
  ManifestIndex,
  ManifestEvent,
  ManifestNewsPost,
  ManifestBoardMember,
  ManifestVolunteerRole,
  ManifestResource,
} from '@schoolyard/content-api'

/**
 * Returns the base URL the mobile app uses to fetch the content manifest.
 * Priority: env override → school.config.json deployment.siteUrl → empty string.
 * An empty base URL short-circuits fetches so the app doesn't crash in dev
 * when no site has been deployed yet.
 */
export function getBaseUrl(): string {
  // EXPO_PUBLIC_ env vars are injected at bundle time by the Expo runtime.
  const envUrl =
    typeof process !== 'undefined' ? (process.env?.EXPO_PUBLIC_MANIFEST_BASE_URL ?? '') : ''
  return envUrl || siteConfig.deployment.siteUrl || ''
}

export function hasBaseUrl(): boolean {
  return getBaseUrl().length > 0
}

export function fetchManifest(signal?: AbortSignal): Promise<ManifestIndex> {
  return apiFetchManifest(getBaseUrl(), { signal })
}

export function fetchEvents(signal?: AbortSignal): Promise<ManifestEvent[]> {
  return apiFetchEvents(getBaseUrl(), { signal })
}

export function fetchNews(signal?: AbortSignal): Promise<ManifestNewsPost[]> {
  return apiFetchNews(getBaseUrl(), { signal })
}

export function fetchBoard(signal?: AbortSignal): Promise<ManifestBoardMember[]> {
  return apiFetchBoard(getBaseUrl(), { signal })
}

export function fetchVolunteers(signal?: AbortSignal): Promise<ManifestVolunteerRole[]> {
  return apiFetchVolunteers(getBaseUrl(), { signal })
}

export function fetchResources(signal?: AbortSignal): Promise<ManifestResource[]> {
  return apiFetchResources(getBaseUrl(), { signal })
}
