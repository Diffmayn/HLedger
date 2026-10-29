import { cn } from '@/lib/utils'

const SETS: Record<string, string[]> = {
  love: ['❤️', '🥰', '😘', '💐', '🌹', '💖', '🫶', '🥹'],
  party: ['🎉', '🥂', '🍾', '🎂', '🎈', '🎊', '🪩', '🎁'],
  cheer: ['👏', '🙌', '💪', '🏆', '⭐', '🔥', '🚀', '✨'],
  faces: ['😂', '😎', '🤩', '😊', '🤗', '😁', '🥳', '🫡'],
}

export function EmojiPicker({
  value,
  onChange,
  max = 8,
  className,
}: {
  value: string[]
  onChange: (next: string[]) => void
  max?: number
  className?: string
}) {
  const add = (e: string) => {
    if (value.length >= max) return
    onChange([...value, e])
  }
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-2 text-2xl">
          {value.map((e, i) => (
            <button
              key={`${e}-${i}`}
              type="button"
              className="rounded-lg px-1 hover:bg-surface"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label={`Remove ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {Object.entries(SETS).map(([group, list]) => (
          <div key={group} className="flex flex-wrap gap-1">
            {list.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => add(e)}
                disabled={value.length >= max}
                className="size-11 rounded-xl text-2xl transition-colors hover:bg-surface-2 disabled:opacity-40"
                aria-label={e}
              >
                {e}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
