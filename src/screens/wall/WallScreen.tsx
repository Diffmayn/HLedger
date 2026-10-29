import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Images, MessageSquareHeart, Video } from 'lucide-react'
import { useEventContext } from '@/screens/shared/useEventContext'
import { useEntries } from '@/data/entries'
import { useReactionSummary } from '@/data/reactions'
import { EntryCard } from '@/screens/shared/EntryCard'
import { QrCode } from '@/screens/shared/QrCode'
import { eventUrl } from '@/lib/links'
import { useIdle } from '@/lib/useIdle'
import { useWakeLock } from '@/lib/useWakeLock'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import type { Entry } from '@/types/domain'

const MAX_GRID = 60
const SLIDE_MS = 7000
const SLIDE_VIDEO_MAX_MS = 45_000

export default function WallScreen() {
  const { event } = useEventContext()
  const t = useT()
  const { data: entries = [], isLoading } = useEntries(event.id)
  const reactions = useReactionSummary(event.id)
  const [mode, setMode] = useState<'grid' | 'slideshow'>('grid')
  const [slide, setSlide] = useState(0)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const seen = useRef<Set<string>>(new Set())
  const idle = useIdle(3000)
  useWakeLock()

  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries])
  const gridEntries = useMemo(() => published.slice(0, MAX_GRID), [published])

  // Highlight entries that arrive while the wall is open.
  useEffect(() => {
    if (!seen.current.size) {
      for (const e of published) seen.current.add(e.id)
      return
    }
    const fresh = published.find((e) => !seen.current.has(e.id))
    if (fresh) {
      for (const e of published) seen.current.add(e.id)
      setHighlightId(fresh.id)
      setSlide(0)
      const timer = setTimeout(() => setHighlightId(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [published])

  // Keyboard: S toggles slideshow, arrows navigate, F fullscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') setMode((m) => (m === 'grid' ? 'slideshow' : 'grid'))
      if (e.key === 'ArrowRight') setSlide((s) => s + 1)
      if (e.key === 'ArrowLeft') setSlide((s) => Math.max(0, s - 1))
      if (e.key === 'f' || e.key === 'F') void document.documentElement.requestFullscreen?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const current: Entry | undefined = published.length ? published[slide % published.length] : undefined

  // Auto-advance; videos get their own duration (capped).
  const advance = useCallback(() => setSlide((s) => s + 1), [])
  useEffect(() => {
    if (mode !== 'slideshow' || !current) return
    const ms = current.kind === 'video' ? Math.min(SLIDE_VIDEO_MAX_MS, Math.max(SLIDE_MS, current.durationMs + 800)) : SLIDE_MS
    const timer = setTimeout(advance, ms)
    return () => clearTimeout(timer)
  }, [mode, current, advance])

  const counts = useMemo(
    () => ({
      messages: published.filter((e) => e.kind === 'message').length,
      photos: published.filter((e) => e.kind === 'photo' || e.kind === 'strip').length,
      videos: published.filter((e) => e.kind === 'video').length,
    }),
    [published],
  )

  const guestLink = eventUrl(event.slug)

  return (
    <div className={cn('relative flex h-full flex-col overflow-hidden bg-bg', idle && 'cursor-hidden')}>
      <header className="flex items-end justify-between gap-6 px-10 pb-4 pt-8">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-ink-3">{event.subtitle}</p>
          <h1 className="text-5xl leading-none">{event.title}</h1>
        </div>
        <div className="flex items-center gap-6 text-ink-2">
          <Stat icon={<MessageSquareHeart />} label={t('wall.messages', { n: counts.messages })} />
          <Stat icon={<Images />} label={t('wall.photos', { n: counts.photos })} />
          {counts.videos > 0 && <Stat icon={<Video />} label={t('wall.videos', { n: counts.videos })} />}
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'grid' ? 'slideshow' : 'grid'))}
            className={cn(
              'rounded-full border px-4 py-2 text-sm text-ink-2 transition-opacity hover:bg-surface-2 focus-visible:opacity-100',
              idle ? 'opacity-0' : 'opacity-100',
            )}
          >
            {mode === 'grid' ? t('wall.slideshow') : t('wall.grid')}
          </button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden px-10 pb-6">
        {published.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="flex flex-col items-center gap-8 text-center">
              <p className="font-hand text-5xl text-ink-2 animate-pulse-soft">{isLoading ? t('loading') : t('wall.waiting')}</p>
              <QrCode value={guestLink} size={240} className="shadow-card" />
              <p className="text-xl text-ink-2">{t('wall.scanToPost')}</p>
            </div>
          </div>
        ) : mode === 'slideshow' && current ? (
          <div key={`${current.id}-${slide}`} className="flex h-full items-center justify-center animate-rise">
            <div className={cn('w-full', current.kind === 'message' ? 'max-w-4xl' : current.kind === 'strip' ? 'max-w-sm' : 'max-w-5xl')}>
              <EntryCard entry={current} reactions={reactions.get(current.id)} size="large" autoplayVideo className="rotate-0" />
            </div>
            <div className="absolute inset-x-10 bottom-3 h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-accent" style={{ width: `${((slide % published.length) + 1) / published.length * 100}%` }} />
            </div>
          </div>
        ) : (
          <div className="columns-2 gap-5 md:columns-3 xl:columns-4 2xl:columns-5 [column-fill:balance]">
            {gridEntries.map((entry) => (
              <div key={entry.id} className="mb-5 break-inside-avoid">
                <EntryCard entry={entry} reactions={reactions.get(entry.id)} highlight={entry.id === highlightId} />
              </div>
            ))}
          </div>
        )}
        <div aria-live="polite" className="sr-only">
          {highlightId ? t('wall.newEntry', { name: published.find((e) => e.id === highlightId)?.authorName ?? '' }) : ''}
        </div>
      </main>

      {published.length > 0 && (
        <aside className="pointer-events-none absolute bottom-6 right-8 flex items-center gap-4 rounded-card bg-surface/90 p-3 pr-5 shadow-card backdrop-blur">
          <QrCode value={guestLink} size={96} />
          <div>
            <p className="font-display text-lg leading-tight">{t('wall.scanToPost')}</p>
            <p className="text-sm text-ink-3">{guestLink.replace(/^https?:\/\//, '')}</p>
          </div>
        </aside>
      )}
    </div>
  )
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2 text-lg [&>svg]:size-5">
      {icon}
      {label}
    </span>
  )
}
