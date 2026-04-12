import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

/**
 * Calls `callback` whenever the app state changes (e.g. background -> active).
 * Useful for refetching data when the user returns to the app.
 */
export function useAppState(callback: (state: AppStateStatus) => void) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      callbackRef.current(nextState)
    })
    return () => subscription.remove()
  }, [])
}
