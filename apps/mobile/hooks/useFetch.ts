import { useEffect, useState, useRef } from 'react'

/**
 * Minimal fetch-on-mount hook with loading/error states.
 * Kept intentionally small — no React Query dependency, no caching layer.
 * For offline support we rely on the native HTTP cache from Expo,
 * which is enough for v1 given how small the manifest files are.
 */
export interface FetchState<T> {
  data: T | undefined
  loading: boolean
  error: Error | undefined
  /** Manually re-run the fetcher. */
  refetch: () => void
}

export function useFetch<T>(
  fetcher: (signal?: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): FetchState<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [nonce, setNonce] = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    setLoading(true)
    setError(undefined)

    fetcher(controller.signal)
      .then((result) => {
        if (mounted.current) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (mounted.current && err?.name !== 'AbortError') {
          setError(err instanceof Error ? err : new Error(String(err)))
          setLoading(false)
        }
      })

    return () => {
      mounted.current = false
      controller.abort()
    }
    // Intentionally depends only on nonce + caller-supplied deps.
    // The fetcher closure is recreated on each render by hook callers,
    // so including it would cause an infinite loop. Callers should
    // wrap `fetcher` in useCallback if they want identity stability.
  }, [nonce, ...deps])

  return {
    data,
    loading,
    error,
    refetch: () => setNonce((n) => n + 1),
  }
}
