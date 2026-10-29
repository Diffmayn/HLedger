import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DetectInput, getLandmarker, type FaceLandmarkerResult } from './landmarker'
import { FaceFilterScene } from './scene'
import { loadManifest, slotOf, type FilterDef, type FilterManifest } from './manifest'
import { pickRecordingMimeType } from '@/lib/media'

export type ArStage = 'idle' | 'wasm' | 'model' | 'ready' | 'error'

export interface FaceFilterController {
  stage: ArStage
  error: string | null
  manifest: FilterManifest | null
  active: FilterDef[]
  faceCount: number
  fps: number
  /** Toggle a filter; replaces any filter already in the same slot. */
  toggle: (def: FilterDef) => void
  clear: () => void
  capture: () => HTMLCanvasElement | null
  startRecording: (withAudio?: boolean) => Promise<void>
  stopRecording: () => Promise<{ blob: Blob; mime: string } | null>
  isRecording: boolean
}

interface Options {
  video: HTMLVideoElement | null
  canvas: HTMLCanvasElement | null
  /** Video is playing and has dimensions. */
  videoReady: boolean
  enabled?: boolean
}

export function useFaceFilters({ video, canvas, videoReady, enabled = true }: Options): FaceFilterController {
  const [stage, setStage] = useState<ArStage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [manifest, setManifest] = useState<FilterManifest | null>(null)
  const [active, setActive] = useState<FilterDef[]>([])
  const [faceCount, setFaceCount] = useState(0)
  const [fps, setFps] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const sceneRef = useRef<FaceFilterScene | null>(null)
  const recorderRef = useRef<{ recorder: MediaRecorder; chunks: Blob[]; mime: string; audio?: MediaStream } | null>(null)

  useEffect(() => {
    void loadManifest().then(setManifest).catch((e: Error) => setError(e.message))
  }, [])

  // Scene + detection loop lifecycle.
  useEffect(() => {
    if (!enabled || !video || !canvas || !videoReady) return
    let cancelled = false
    let rafHandle = 0
    let vfcHandle = 0
    const scene = new FaceFilterScene({ canvas, video, mirror: true })
    sceneRef.current = scene
    void scene.setFilters(active)

    const detectInput = new DetectInput()
    let lastResult: FaceLandmarkerResult | null = null
    let lastT = 0
    let frameTimes: number[] = []
    let skipNext = false
    let lastFaceCount = -1
    let fpsTick = performance.now()
    let frames = 0

    const loop = (lm: Awaited<ReturnType<typeof getLandmarker>>) => {
      const tick = () => {
        if (cancelled) return
        const now = performance.now()
        if (document.hidden) {
          schedule()
          return
        }
        if (now - lastT < 1) {
          schedule()
          return
        }
        lastT = now
        const start = now
        if (!skipNext) {
          try {
            lastResult = lm.detectForVideo(detectInput.frame(video), now)
          } catch (e) {
            console.warn('[ar] detect failed', e)
          }
        }
        scene.update(lastResult, now)
        scene.render()
        const cost = performance.now() - start
        frameTimes.push(cost)
        if (frameTimes.length > 30) frameTimes = frameTimes.slice(-30)
        const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
        // Below ~20 fps, detect every other frame and keep rendering the smoothed pose.
        skipNext = avg > 50 ? !skipNext : false
        frames++
        if (now - fpsTick > 1000) {
          setFps(Math.round((frames * 1000) / (now - fpsTick)))
          fpsTick = now
          frames = 0
        }
        const fc = scene.faceCount
        if (fc !== lastFaceCount) {
          lastFaceCount = fc
          setFaceCount(fc)
        }
        schedule()
      }
      const schedule = () => {
        if (cancelled) return
        if ('requestVideoFrameCallback' in video) {
          vfcHandle = video.requestVideoFrameCallback(() => tick())
        } else {
          rafHandle = requestAnimationFrame(tick)
        }
      }
      schedule()
    }

    setStage('wasm')
    getLandmarker({ onProgress: (s) => !cancelled && setStage(s) })
      .then((lm) => {
        if (cancelled) return
        setStage('ready')
        loop(lm)
      })
      .catch((e: Error) => {
        if (cancelled) return
        setStage('error')
        setError(e.message)
        // Still show the camera: render the video plane without detection.
        const fallback = () => {
          if (cancelled) return
          scene.update(null, performance.now())
          scene.render()
          rafHandle = requestAnimationFrame(fallback)
        }
        fallback()
      })

    return () => {
      cancelled = true
      if (vfcHandle && 'cancelVideoFrameCallback' in video) video.cancelVideoFrameCallback(vfcHandle)
      if (rafHandle) cancelAnimationFrame(rafHandle)
      scene.dispose()
      sceneRef.current = null
    }
    // `active` is pushed via setFilters below, not by re-creating the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, video, canvas, videoReady])

  useEffect(() => {
    void sceneRef.current?.setFilters(active)
  }, [active])

  const toggle = useCallback((def: FilterDef) => {
    setActive((prev) => {
      if (prev.some((d) => d.id === def.id)) return prev.filter((d) => d.id !== def.id)
      const slot = slotOf(def)
      return [...prev.filter((d) => slotOf(d) !== slot), def]
    })
  }, [])

  const clear = useCallback(() => setActive([]), [])

  const capture = useCallback(() => sceneRef.current?.capture() ?? null, [])

  const startRecording = useCallback(
    async (withAudio = true) => {
      const scene = sceneRef.current
      if (!scene || recorderRef.current) return
      const stream = scene.renderer.domElement.captureStream(30)
      let audio: MediaStream | undefined
      if (withAudio) {
        try {
          audio = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          for (const track of audio.getAudioTracks()) stream.addTrack(track)
        } catch {
          audio = undefined
        }
      }
      const mime = pickRecordingMimeType(Boolean(audio))
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined)
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      recorder.start(500)
      recorderRef.current = { recorder, chunks, mime: recorder.mimeType || mime || 'video/webm', audio }
      setIsRecording(true)
    },
    [],
  )

  const stopRecording = useCallback(async () => {
    const r = recorderRef.current
    if (!r) return null
    recorderRef.current = null
    setIsRecording(false)
    const blob = await new Promise<Blob>((resolve) => {
      r.recorder.onstop = () => resolve(new Blob(r.chunks, { type: r.mime }))
      r.recorder.stop()
    })
    r.audio?.getTracks().forEach((t) => t.stop())
    return { blob, mime: r.mime }
  }, [])

  return useMemo(
    () => ({ stage, error, manifest, active, faceCount, fps, toggle, clear, capture, startRecording, stopRecording, isRecording }),
    [stage, error, manifest, active, faceCount, fps, toggle, clear, capture, startRecording, stopRecording, isRecording],
  )
}
