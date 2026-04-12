import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours — keep cached data for offline
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

export { queryClient }

export function AppProviders({ children }: { children: ReactNode }) {
  const [, setReady] = useState(false)

  useEffect(() => {
    // Set up SQLite-backed query persistence for offline support.
    // Uses require() to handle optional deps gracefully — if expo-sqlite
    // or the persister packages aren't available, we fall back to
    // memory-only caching.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createSyncStoragePersister } = require('@tanstack/query-sync-storage-persister')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { openDatabaseSync } = require('expo-sqlite')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { persistQueryClient } = require('@tanstack/react-query-persist-client')

      const db = openDatabaseSync('schoolyard-cache.db')
      db.execSync('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)')

      const storage = {
        getItem: (key: string): string | null => {
          const row = db.getFirstSync('SELECT value FROM kv WHERE key = ?', [key]) as {
            value: string
          } | null
          return row?.value ?? null
        },
        setItem: (key: string, value: string) => {
          db.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, value])
        },
        removeItem: (key: string) => {
          db.runSync('DELETE FROM kv WHERE key = ?', [key])
        },
      }

      const persister = createSyncStoragePersister({ storage })
      persistQueryClient({
        queryClient,
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      })
    } catch {
      // SQLite or persister not available — silent fallback to memory cache
    }
    setReady(true)
  }, [])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
