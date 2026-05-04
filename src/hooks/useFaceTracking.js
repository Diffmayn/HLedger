import { useState, useRef, useCallback, useEffect } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

let landmarkerInstance = null
let landmarkerPromise = null
const LANDMARK_SMOOTHING = 0.38

// Pin to exact version matching the installed npm package to avoid CDN/version mismatches
const VISION_WASM_URL = '/mediapipe/wasm'
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

async function getLandmarker() {
  if (landmarkerInstance) return landmarkerInstance
  if (landmarkerPromise) return landmarkerPromise

  landmarkerPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(VISION_WASM_URL)

    const baseOptions = { modelAssetPath: MODEL_URL }
    const commonOptions = {
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true
    }

    // Try GPU first, then CPU fallback
    for (const delegate of ['GPU', 'CPU']) {
      try {
        const lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { ...baseOptions, delegate },
          ...commonOptions
        })
        console.log(`Face tracking initialized with ${delegate} delegate`)
        return lm
      } catch (err) {
        console.warn(`${delegate} delegate failed:`, err.message)
        if (delegate === 'CPU') throw err
      }
    }
  })()

  try {
    landmarkerInstance = await landmarkerPromise
    return landmarkerInstance
  } catch (err) {
    landmarkerPromise = null
    throw err
  }
}

function smoothFaceLandmarks(previousFaces, nextFaces, alpha = LANDMARK_SMOOTHING) {
  if (!nextFaces?.length) return []
  if (!previousFaces?.length || previousFaces.length !== nextFaces.length) {
    return nextFaces
  }

  return nextFaces.map((face, faceIndex) => {
    const previousFace = previousFaces[faceIndex]
    if (!previousFace || previousFace.length !== face.length) {
      return face
    }

    return face.map((point, pointIndex) => {
      const previousPoint = previousFace[pointIndex]
      if (!previousPoint) return point

      return {
        ...point,
        x: previousPoint.x + (point.x - previousPoint.x) * alpha,
        y: previousPoint.y + (point.y - previousPoint.y) * alpha,
        z: (previousPoint.z ?? point.z ?? 0) + ((point.z ?? 0) - (previousPoint.z ?? point.z ?? 0)) * alpha
      }
    })
  })
}

export default function useFaceTracking(videoRef) {
  const [landmarks, setLandmarks] = useState([])
  const [isTracking, setIsTracking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [trackingError, setTrackingError] = useState(null)
  const rafRef = useRef(null)
  const activeRef = useRef(false)
  const lastTimeRef = useRef(-1)
  const previousLandmarksRef = useRef([])

  const start = useCallback(async () => {
    if (activeRef.current) return
    setIsLoading(true)
    setTrackingError(null)

    try {
      const landmarker = await getLandmarker()
      activeRef.current = true
      setIsTracking(true)
      setIsLoading(false)

      const detect = () => {
        if (!activeRef.current) return
        const video = videoRef.current
        if (video && video.readyState >= 2) {
          const now = performance.now()
          if (now !== lastTimeRef.current) {
            lastTimeRef.current = now
            try {
              const result = landmarker.detectForVideo(video, now)
              const smoothedLandmarks = smoothFaceLandmarks(
                previousLandmarksRef.current,
                result.faceLandmarks || []
              )
              previousLandmarksRef.current = smoothedLandmarks
              setLandmarks(smoothedLandmarks)
            } catch (_) { /* skip frame */ }
          }
        }
        rafRef.current = requestAnimationFrame(detect)
      }
      detect()
    } catch (err) {
      console.error('Face tracking init failed:', err)
      setTrackingError('Face tracking is unavailable on this device/browser. You can still take photos without filters.')
      setIsTracking(false)
      setIsLoading(false)
    }
  }, [videoRef])

  const stop = useCallback(() => {
    activeRef.current = false
    setIsTracking(false)
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    previousLandmarksRef.current = []
    setLandmarks([])
  }, [])

  useEffect(() => {
    return () => stop()
  }, [stop])

  return { landmarks, isTracking, isLoading, trackingError, faceCount: landmarks.length, start, stop }
}
