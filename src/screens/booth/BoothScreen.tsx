import { useCallback, useEffect, useRef, useState } from 'react'
import { Ban, Camera, CircleDot, Film, RotateCcw, Send, Square, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/components/ui/Toast'
import { useEventContext } from '@/screens/shared/useEventContext'
import { useCreateEntry } from '@/data/entries'
import { useCamera } from '@/lib/useCamera'
import { useWakeLock } from '@/lib/useWakeLock'
import { useIdle } from '@/lib/useIdle'
import { composeStrip, prepareImage, prepareVideo } from '@/lib/media'
import { useFaceFilters } from '@/ar/useFaceFilters'
import { CATEGORY_ORDER, assetUrl, type FilterDef } from '@/ar/manifest'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { useCountdown } from './useCountdown'
import { playBeep, playShutter } from './sounds'

type Mode = 'single' | 'strip' | 'video'
type Phase = 'live' | 'counting' | 'recording' | 'review' | 'sending'

interface Capture {
  kind: 'photo' | 'strip' | 'video'
  canvas?: HTMLCanvasElement
  video?: { blob: Blob; mime: string; url: string }
}

const ATTRACT_AFTER_MS = 45_000
const MAX_RECORD_MS = 30_000

export default function BoothScreen() {
  const { event } = useEventContext()
  const t = useT()
  const [mode, setMode] = useState<Mode>('single')
  const [phase, setPhase] = useState<Phase>('live')
  const [capture, setCapture] = useState<Capture | null>(null)
  const [authorName, setAuthorName] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORY_ORDER)[number]>('hats')
  const [recordMs, setRecordMs] = useState(0)
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)
  const cam = useCamera(true)
  const ar = useFaceFilters({ video: videoEl, canvas: canvasEl, videoReady: cam.ready, enabled: phase !== 'review' && phase !== 'sending' })
  const countdown = useCountdown()
  const create = useCreateEntry()
  const idle = useIdle(ATTRACT_AFTER_MS, phase === 'live')
  const recordTimer = useRef<number | null>(null)
  useWakeLock()

  const videoRefCb = useCallback(
    (el: HTMLVideoElement | null) => {
      cam.videoRef.current = el
      setVideoEl(el)
    },
    [cam.videoRef],
  )

  const allowed = event.settings.allowedKinds
  const maxRecord = Math.min(MAX_RECORD_MS, event.settings.maxVideoSeconds * 1000)

  const takeShot = useCallback(() => {
    const canvas = ar.capture()
    playShutter()
    return canvas
  }, [ar])

  const runSingle = useCallback(async () => {
    setPhase('counting')
    await countdown.run(3, playBeep)
    const canvas = takeShot()
    countdown.flash()
    if (!canvas) return setPhase('live')
    setCapture({ kind: 'photo', canvas })
    setPhase('review')
  }, [countdown, takeShot])

  const runStrip = useCallback(async () => {
    setPhase('counting')
    const frames: HTMLCanvasElement[] = []
    for (let i = 0; i < 4; i++) {
      await countdown.run(i === 0 ? 3 : 2, playBeep)
      const c = takeShot()
      countdown.flash()
      if (c) frames.push(c)
      if (i < 3) await new Promise((r) => setTimeout(r, 700))
    }
    if (frames.length < 2) return setPhase('live')
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--t-surface').trim() || '#ffffff'
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--t-ink').trim() || '#222222'
    const strip = await composeStrip(frames, { background: accent, label: event.title, labelColor: ink })
    setCapture({ kind: 'strip', canvas: strip })
    setPhase('review')
  }, [countdown, takeShot, event.title])

  const stopRecording = useCallback(async () => {
    if (recordTimer.current) window.clearInterval(recordTimer.current)
    recordTimer.current = null
    const result = await ar.stopRecording()
    if (!result) return setPhase('live')
    setCapture({ kind: 'video', video: { ...result, url: URL.createObjectURL(result.blob) } })
    setPhase('review')
  }, [ar])

  const runVideo = useCallback(async () => {
    setPhase('counting')
    await countdown.run(3, playBeep)
    await ar.startRecording(true)
    setPhase('recording')
    const started = performance.now()
    setRecordMs(0)
    recordTimer.current = window.setInterval(() => {
      const ms = performance.now() - started
      setRecordMs(ms)
      if (ms >= maxRecord) void stopRecording()
    }, 100)
  }, [ar, countdown, maxRecord, stopRecording])

  const start = () => {
    if (phase !== 'live') return
    if (mode === 'single') void runSingle()
    else if (mode === 'strip') void runStrip()
    else void runVideo()
  }

  const retake = () => {
    if (capture?.video) URL.revokeObjectURL(capture.video.url)
    setCapture(null)
    setPhase('live')
  }

  const send = async () => {
    if (!capture) return
    setPhase('sending')
    const filtersUsed = ar.active.map((f) => f.id)
    try {
      if (capture.canvas) {
        const img = await prepareImage(capture.canvas)
        await create.mutateAsync({
          input: {
            eventId: event.id,
            kind: capture.kind === 'strip' ? 'strip' : 'photo',
            authorName,
            media: { blob: img.blob, mime: img.mime, width: img.width, height: img.height },
            thumb: img.thumb,
            filtersUsed,
          },
        })
      } else if (capture.video) {
        const v = await prepareVideo(capture.video.blob, capture.video.mime)
        await create.mutateAsync({
          input: {
            eventId: event.id,
            kind: 'video',
            authorName,
            media: { blob: v.blob, mime: v.mime, width: v.width, height: v.height, durationMs: v.durationMs },
            thumb: v.poster,
            filtersUsed,
          },
        })
      }
      toast.success(t('booth.sent'))
      setAuthorName('')
      retake()
    } catch (e) {
      toast.error((e as Error).message)
      setPhase('review')
    }
  }

  // Cancel timers on unmount.
  useEffect(
    () => () => {
      if (recordTimer.current) window.clearInterval(recordTimer.current)
    },
    [],
  )

  const filters = (ar.manifest?.filters ?? []).filter((f) => f.category === category)
  const isActive = (f: FilterDef) => ar.active.some((a) => a.id === f.id)

  if (cam.error) {
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <div>
          <Ban className="mx-auto size-12 text-danger" />
          <h1 className="mt-4 text-3xl">{t('booth.cameraDenied')}</h1>
          <p className="mt-2 text-ink-2">{cam.error}</p>
          <Button className="mt-6" onClick={() => void cam.restart()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col bg-black text-white">
      {/* Camera + overlay */}
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRefCb} className="absolute inset-0 h-full w-full object-cover opacity-0" playsInline muted autoPlay />
        <canvas ref={setCanvasEl} className={cn('absolute inset-0 h-full w-full object-cover', phase === 'review' && 'hidden')} />

        {phase === 'review' && capture && (
          <div className="absolute inset-0 grid place-items-center bg-black p-6">
            {capture.canvas ? (
              <img src={capture.canvas.toDataURL('image/jpeg', 0.85)} alt="" className={cn('max-h-full max-w-full rounded-xl object-contain', capture.kind === 'strip' && 'max-h-[85vh]')} />
            ) : capture.video ? (
              <video src={capture.video.url} className="max-h-full max-w-full rounded-xl" controls autoPlay playsInline />
            ) : null}
          </div>
        )}

        {phase === 'sending' && (
          <div className="absolute inset-0 grid place-items-center bg-black/70">
            <Spinner label={t('guest.sending')} className="text-white" />
          </div>
        )}

        {countdown.value !== null && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span key={countdown.value} className="font-display text-[22vmin] font-bold leading-none text-white drop-shadow-2xl animate-rise">{countdown.value}</span>
          </div>
        )}
        {countdown.flashing && <div className="pointer-events-none absolute inset-0 bg-white" />}

        {phase === 'recording' && (
          <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 backdrop-blur">
            <CircleDot className="size-4 animate-pulse text-red-500" />
            <span className="text-sm font-medium">{t('booth.recording')} {Math.round(recordMs / 1000)}s / {Math.round(maxRecord / 1000)}s</span>
          </div>
        )}

        {(ar.stage === 'wasm' || ar.stage === 'model') && phase === 'live' && (
          <div className="absolute right-6 top-6 rounded-full bg-black/60 px-4 py-2 text-sm backdrop-blur">
            <Spinner label={t('booth.loadingFilters')} className="text-white" />
          </div>
        )}
        {ar.stage === 'ready' && phase === 'live' && ar.faceCount === 0 && ar.active.length > 0 && (
          <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 rounded-full bg-black/60 px-5 py-2 text-lg backdrop-blur">
            <Users className="mr-2 inline size-5" /> {t('booth.noFace')}
          </div>
        )}
        {import.meta.env.DEV && ar.stage === 'ready' && (
          <div className="absolute bottom-3 left-3 rounded bg-black/50 px-2 py-1 font-mono text-xs">{ar.fps} fps · {ar.faceCount} faces</div>
        )}

        {idle && phase === 'live' && (
          <div className="absolute inset-0 grid place-items-center bg-black/55 text-center">
            <span className="font-hand text-6xl animate-pulse-soft">{t('booth.attract')}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="safe-pb flex flex-col gap-3 bg-black px-4 pt-3">
        {phase === 'review' ? (
          <div className="flex items-center gap-3">
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder={t('booth.yourName')}
              maxLength={80}
              className="h-14 min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-5 text-lg text-white outline-none placeholder:text-white/50 focus:border-white/60"
            />
            <Button variant="glass" size="xl" onClick={retake}>
              <RotateCcw className="size-5" /> {t('booth.retake')}
            </Button>
            <Button size="xl" onClick={() => void send()}>
              <Send className="size-5" /> {t('booth.keep')}
            </Button>
          </div>
        ) : (
          <>
            {ar.manifest && phase === 'live' && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={ar.clear}
                    className={cn('shrink-0 rounded-full px-4 py-2 text-sm', ar.active.length === 0 ? 'bg-white text-black' : 'bg-white/10')}
                  >
                    {t('booth.none')}
                  </button>
                  {CATEGORY_ORDER.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={cn('shrink-0 rounded-full px-4 py-2 text-sm capitalize', category === c ? 'bg-white text-black' : 'bg-white/10')}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 overflow-x-auto py-1 scrollbar-none" role="listbox" aria-label="Filters">
                  {filters.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="option"
                      aria-selected={isActive(f)}
                      onClick={() => ar.toggle(f)}
                      className={cn(
                        'relative size-20 shrink-0 overflow-hidden rounded-2xl bg-white/10 ring-2 ring-transparent transition-transform active:scale-95',
                        isActive(f) && 'ring-accent bg-white/25',
                      )}
                      title={f.name}
                    >
                      <img src={assetUrl(f.thumb)} alt={f.name} className="h-full w-full object-contain p-1" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2">
                {allowed.includes('photo') && <ModeButton active={mode === 'single'} onClick={() => setMode('single')} icon={<Camera />} label={t('booth.single')} disabled={phase !== 'live'} />}
                {allowed.includes('strip') && <ModeButton active={mode === 'strip'} onClick={() => setMode('strip')} icon={<Film />} label={t('booth.strip')} disabled={phase !== 'live'} />}
                {allowed.includes('video') && <ModeButton active={mode === 'video'} onClick={() => setMode('video')} icon={<CircleDot />} label={t('booth.video')} disabled={phase !== 'live'} />}
              </div>
              {phase === 'recording' ? (
                <button type="button" onClick={() => void stopRecording()} className="grid size-20 place-items-center rounded-full bg-red-600 text-white shadow-pop" aria-label={t('booth.stop')}>
                  <Square className="size-8" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={start}
                  disabled={phase !== 'live' || !cam.ready}
                  className="grid size-20 place-items-center rounded-full border-4 border-white bg-white/20 shadow-pop transition-transform active:scale-95 disabled:opacity-40"
                  aria-label={t('booth.tapToStart')}
                >
                  <span className={cn('size-14 rounded-full', mode === 'video' ? 'bg-red-600' : 'bg-white')} />
                </button>
              )}
              <div className="w-[7.5rem]" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ModeButton({ active, onClick, icon, label, disabled }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn('flex h-14 items-center gap-2 rounded-full px-4 text-sm font-medium [&>svg]:size-5', active ? 'bg-white text-black' : 'bg-white/10 text-white', 'disabled:opacity-50')}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  )
}
