import { useQuery } from '@tanstack/react-query'
import { fetchDirectory } from '../lib/manifest'
import type { DirectoryEntry } from '@schoolyard/content-api'

export function useDirectory() {
  return useQuery<DirectoryEntry[]>({
    queryKey: ['directory'],
    queryFn: ({ signal }) => fetchDirectory(signal),
  })
}
