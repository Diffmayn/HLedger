import { cn } from '@/lib/utils'
import { REACTION_EMOJI, type ReactionSummary } from '@/data/reactions'

export function ReactionBar({
  summary,
  compact,
  onToggle,
}: {
  summary?: ReactionSummary
  compact?: boolean
  onToggle?: (emoji: string, active: boolean) => void
}) {
  const shown = onToggle
    ? REACTION_EMOJI
    : (Object.keys(summary?.counts ?? {}) as readonly string[])
  if (!shown.length) return null
  return (
    <div className={cn('flex items-center gap-1', compact && 'gap-0.5')} onClick={(e) => e.stopPropagation()}>
      {shown.map((emoji) => {
        const count = summary?.counts[emoji] ?? 0
        const active = summary?.mine.has(emoji) ?? false
        if (!onToggle && !count) return null
        return (
          <button
            key={emoji}
            type="button"
            disabled={!onToggle}
            onClick={() => onToggle?.(emoji, active)}
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-sm transition-colors',
              onToggle && 'hover:bg-surface-2',
              active && 'bg-accent-soft',
              compact && 'px-1.5 text-xs',
            )}
            aria-pressed={onToggle ? active : undefined}
            aria-label={`${emoji} ${count}`}
          >
            <span className={compact ? 'text-base' : 'text-lg'}>{emoji}</span>
            {count > 0 && <span className="tabular-nums text-ink-2">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
