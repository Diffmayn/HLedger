import { useCallback, useEffect, useRef, useState } from 'react'

export interface CameraState {
  videoRef: React.RefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  ready: boolean
  error: string | null
  restart: () => Promise<void>
}

/** Front camera on a <video>; survives StrictMode double-mount and stops tracks on unmount. */
export function useCamera(enabled = true, constraints?: MediaTrackConstraints): CameraState {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
    setReady(false)
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const start = useCallback(async () => {
    const gen = ++generation.current
    stop()
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not available in this browser.')
      return
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          ...constraints,
        },
        audio: false,
      })
      if (gen !== generation.current) {
        s.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = s
      setStream(s)
      const v = videoRef.current
      if (v) {
        v.srcObject = s
        v.muted = true
        v.playsInline = true
        try {
          await v.play()
        } catch (e) {
          if ((e as Error).name !== 'AbortError') throw e
        }
        if (gen === generation.current) setReady(v.videoWidth > 0)
        v.onloadedmetadata = () => gen === generation.current && setReady(true)
      }
    } catch (e) {
      if (gen !== generation.current) return
      const err = e as Error
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied.'
          : err.message || 'Could not start the camera.',
      )
    }
  }, [constraints, stop])

  useEffect(() => {
    if (!enabled) return
    void start()
    return () => {
      generation.current++
      stop()
    }
  }, [enabled, start, stop])

  return { videoRef, stream, ready, error, restart: start }
}
