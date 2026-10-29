import { memo, useState } from 'react'
import { Play } from 'lucide-react'
import { cn, formatDuration, relativeTime, splitEmoji } from '@/lib/utils'
import type { Entry } from '@/types/domain'
import type { ReactionSummary } from '@/data/reactions'
import { ReactionBar } from './ReactionBar'

export interface EntryCardProps {
  entry: Entry
  reactions?: ReactionSummary
  onOpen?: (entry: Entry) => void
  onReact?: (entry: Entry, emoji: string, active: boolean) => void
  size?: 'card' | 'large'
  autoplayVideo?: boolean
  highlight?: boolean
  className?: string
}

const tilt = ['-rotate-1', 'rotate-1', 'rotate-0', '-rotate-[0.5deg]', 'rotate-[0.5deg]']

function tiltFor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return tilt[h % tilt.length]
}

export const EntryCard = memo(function EntryCard({
  entry,
  reactions,
  onOpen,
  onReact,
  size = 'card',
  autoplayVideo = false,
  highlight = false,
  className,
}: EntryCardProps) {
  const [playing, setPlaying] = useState(autoplayVideo)
  const large = size === 'large'
  const emoji = splitEmoji(entry.emojis)
  const isMedia = entry.kind !== 'message'
  const clickable = Boolean(onOpen)

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-card bg-surface text-ink shadow-card transition-transform duration-300',
        !large && tiltFor(entry.id),
        !large && clickable && 'hover:rotate-0 hover:scale-[1.02] cursor-pointer',
        highlight && 'ring-4 ring-accent/60 animate-rise',
        entry.pending && 'opacity-70',
        className,
      )}
      onClick={clickable ? () => onOpen?.(entry) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && onOpen?.(entry) : undefined}
      aria-label={`${entry.kind} from ${entry.authorName || 'anonymous'}`}
    >
      {isMedia && (
        <div className={cn('relative bg-ink/5', entry.kind === 'strip' ? 'aspect-[1/2.6]' : 'aspect-[4/3]')}>
          {entry.kind === 'video' ? (
            playing && entry.mediaUrl ? (
              <video
                src={entry.mediaUrl}
                poster={entry.thumbUrl ?? undefined}
                className="h-full w-full object-cover"
                autoPlay
                muted={!large}
                loop={!large}
                playsInline
                controls={large}
                preload="metadata"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <button
                type="button"
                className="absolute inset-0 grid place-items-center"
                onClick={(e) => {
                  e.stopPropagation()
                  setPlaying(true)
                }}
                aria-label="Play video"
              >
                {entry.thumbUrl && <img src={entry.thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
                <span className="relative grid size-16 place-items-center rounded-full bg-black/55 text-white backdrop-blur">
                  <Play className="size-7 translate-x-0.5" />
                </span>
                {entry.durationMs > 0 && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                    {formatDuration(entry.durationMs)}
                  </span>
                )}
              </button>
            )
          ) : (
            <img
              src={large ? (entry.mediaUrl ?? entry.thumbUrl ?? '') : (entry.thumbUrl ?? entry.mediaUrl ?? '')}
              alt={entry.body || `Photo from ${entry.authorName || 'a guest'}`}
              width={entry.width ?? undefined}
              height={entry.height ?? undefined}
              className={cn('h-full w-full object-cover', large && entry.kind === 'photo' && 'animate-kenburns')}
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
      )}

      {(entry.body || emoji.length > 0 || entry.kind === 'message') && (
        <div className={cn('flex flex-col gap-2 p-5', large && 'p-8')}>
          {entry.body && (
            <p className={cn('font-hand leading-snug text-ink', large ? 'text-4xl' : 'text-2xl', entry.kind === 'message' && !large && 'line-clamp-6')}>
              {entry.body}
            </p>
          )}
          {emoji.length > 0 && (
            <p className={cn('tracking-wide', large ? 'text-4xl' : 'text-2xl')} aria-label="emoji">
              {emoji.slice(0, 8).join(' ')}
            </p>
          )}
        </div>
      )}

      <footer className={cn('mt-auto flex items-center justify-between gap-3 px-5 pb-4', large && 'px-8 pb-6', !entry.body && isMedia && 'pt-4')}>
        <div className="min-w-0">
          <p className={cn('truncate font-display font-semibold', large ? 'text-2xl' : 'text-base')}>
            {entry.authorName || '—'}
          </p>
          <p className="text-xs text-ink-3">{relativeTime(entry.createdAt)}</p>
        </div>
        {reactions || onReact ? (
          <ReactionBar
            summary={reactions}
            compact={!large}
            onToggle={onReact ? (emoji, active) => onReact(entry, emoji, active) : undefined}
          />
        ) : null}
      </footer>
    </article>
  )
})
