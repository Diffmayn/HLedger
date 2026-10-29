import { useEffect, useState } from 'react'

/** True after `ms` without pointer/keyboard/touch activity. */
export function useIdle(ms: number, enabled = true): boolean {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if (!enabled) {
      setIdle(false)
      return
    }
    let timer = window.setTimeout(() => setIdle(true), ms)
    const reset = () => {
      setIdle(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), ms)
    }
    const events = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'] as const
    for (const e of events) window.addEventListener(e, reset, { passive: true })
    return () => {
      window.clearTimeout(timer)
      for (const e of events) window.removeEventListener(e, reset)
    }
  }, [ms, enabled])
  return idle
}
