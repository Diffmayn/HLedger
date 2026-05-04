import { useState, useRef, useCallback, useEffect } from 'react'

export default function useWebcam() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const cancelledRef = useRef(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)

  const startCamera = useCallback(async () => {
    cancelledRef.current = false
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      // StrictMode cleanup may have fired between getUserMedia resolving and now
      if (cancelledRef.current) {
        stream.getTracks().forEach(t => t.stop())
        return
      }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
        } catch (playErr) {
          // AbortError = video element removed from DOM while play() was pending (React StrictMode)
          if (playErr.name === 'AbortError') return
          throw playErr
        }
        if (!cancelledRef.current) setIsReady(true)
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err.message || 'Could not access camera')
        setIsReady(false)
      }
    }
  }, [])

  const stopCamera = useCallback(() => {
    cancelledRef.current = true
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsReady(false)
  }, [])

  const captureFrame = useCallback((overlayCanvas, cssFilter) => {
    const video = videoRef.current
    if (!video) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    // Apply CSS filter if provided
    if (cssFilter && cssFilter !== 'none') {
      ctx.filter = cssFilter
    }
    // Mirror the video
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.filter = 'none'
    // Draw filter overlay on top (face accessories)
    if (overlayCanvas) {
      ctx.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height)
    }
    return canvas.toDataURL('image/jpeg', 0.85)
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  return { videoRef, isReady, error, startCamera, stopCamera, captureFrame }
}
