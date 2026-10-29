import { useCallback, useEffect, useRef, useState } from 'react'

/** Cancellable countdown with a white flash; all timers are cleared on unmount. */
export function useCountdown() {
  const [value, setValue] = useState<number | null>(null)
  const [flashing, setFlashing] = useState(false)
  const timers = useRef<number[]>([])
  const cancelled = useRef(false)

  const clear = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
  }, [])

  useEffect(
    () => () => {
      cancelled.current = true
      clear()
    },
    [clear],
  )

  const run = useCallback(
    (from: number, onTick?: (n: number) => void) =>
      new Promise<void>((resolve) => {
        let n = from
        const step = () => {
          if (cancelled.current) return resolve()
          if (n <= 0) {
            setValue(null)
            return resolve()
          }
          setValue(n)
          onTick?.(n)
          n--
          timers.current.push(window.setTimeout(step, 1000))
        }
        step()
      }),
    [],
  )

  const flash = useCallback(() => {
    setFlashing(true)
    timers.current.push(window.setTimeout(() => setFlashing(false), 180))
  }, [])

  return { value, flashing, run, flash, cancel: clear }
}
