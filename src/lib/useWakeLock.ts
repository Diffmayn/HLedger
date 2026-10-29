import { useEffect } from 'react'

/** Keeps a kiosk screen on while the component is mounted (where supported). */
export function useWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let released = false
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        /* denied or unsupported */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !released) void request()
    }
    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [enabled])
}
