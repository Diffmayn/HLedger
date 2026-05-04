import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupportedRecordingMimeType } from '../utils/videoUtils'

export default function useMediaRecorder() {
  const previewRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const startedAtRef = useRef(0)

  const [isReady, setIsReady] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState('')

  const stopPreview = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsRecording(false)
    setDurationMs(0)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (previewRef.current) {
      previewRef.current.srcObject = null
    }
    setIsReady(false)
  }, [])

  const startPreview = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Video recording is not supported in this browser.')
      return false
    }

    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      })
      streamRef.current = stream
      if (previewRef.current) {
        previewRef.current.srcObject = stream
        await previewRef.current.play()
      }
      setIsReady(true)
      return true
    } catch (err) {
      setError(err?.message || 'Could not access the camera and microphone.')
      setIsReady(false)
      return false
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (typeof MediaRecorder === 'undefined') {
      setError('Recording is not supported in this browser.')
      return false
    }

    if (!streamRef.current) {
      const started = await startPreview()
      if (!started) return false
    }

    try {
      setError('')
      chunksRef.current = []
      const mimeType = getSupportedRecordingMimeType()
      const recorder = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType })
        : new MediaRecorder(streamRef.current)

      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      startedAtRef.current = Date.now()
      setDurationMs(0)
      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startedAtRef.current)
      }, 200)

      recorder.start(250)
      setIsRecording(true)
      return true
    } catch (err) {
      setError(err?.message || 'Recording could not be started.')
      return false
    }
  }, [startPreview])

  const stopRecording = useCallback(() => {
    return new Promise((resolve, reject) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(null)
        return
      }

      recorder.onstop = () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        const elapsed = Date.now() - startedAtRef.current
        const mimeType = recorder.mimeType || getSupportedRecordingMimeType() || 'video/webm'
        setIsRecording(false)
        setDurationMs(elapsed)
        recorderRef.current = null
        resolve({
          blob: new Blob(chunksRef.current, { type: mimeType }),
          mimeType,
          durationMs: elapsed
        })
      }

      recorder.onerror = () => {
        setError('Recording failed. Please try again.')
        setIsRecording(false)
        reject(new Error('Recording failed.'))
      }

      recorder.stop()
    })
  }, [])

  useEffect(() => {
    return () => stopPreview()
  }, [stopPreview])

  return {
    previewRef,
    isReady,
    isRecording,
    durationMs,
    error,
    startPreview,
    stopPreview,
    startRecording,
    stopRecording,
    streamRef
  }
}