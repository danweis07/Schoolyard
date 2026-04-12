import { useQuery } from '@tanstack/react-query'
import { fetchConferenceWindows, fetchConferenceSlots } from '../lib/manifest'
import type { ConferenceWindow, ConferenceSlot } from '@schoolyard/content-api'

export function useConferenceWindows() {
  return useQuery<ConferenceWindow[]>({
    queryKey: ['conferenceWindows'],
    queryFn: ({ signal }) => fetchConferenceWindows(signal),
  })
}

export function useConferenceSlots(windowSlug: string) {
  return useQuery<ConferenceSlot[]>({
    queryKey: ['conferenceSlots', windowSlug],
    queryFn: ({ signal }) => fetchConferenceSlots(windowSlug, signal),
    enabled: !!windowSlug,
  })
}
