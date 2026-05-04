import { useEffect, useRef, useCallback } from 'react'

const CHANNEL_NAME = 'jeannette-guestbook'

export default function useBroadcastChannel(onMessage) {
  const channelRef = useRef(null)

  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = ch
    if (onMessage) {
      ch.onmessage = (e) => onMessage(e.data)
    }
    return () => ch.close()
  }, [onMessage])

  const broadcast = useCallback((type, payload) => {
    if (channelRef.current) {
      channelRef.current.postMessage({ type, payload })
    }
  }, [])

  return { broadcast }
}
