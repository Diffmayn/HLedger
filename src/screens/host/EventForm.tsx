import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { EventInput } from '@/data/events'
import { DEFAULT_SETTINGS, type GuestbookEvent } from '@/types/domain'
import type { EntryKind } from '@/types/database'
import { useT } from '@/i18n'

const KINDS: EntryKind[] = ['message', 'photo', 'strip', 'video']

export function EventForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: GuestbookEvent
  onSubmit: (input: EventInput) => void | Promise<void>
  onCancel?: () => void
  submitting?: boolean
}) {
  const t = useT()
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? '')
  const [preset, setPreset] = useState(initial?.theme.preset ?? 'classic-warm')
  const [accent, setAccent] = useState(initial?.theme.accent ?? '')
  const [language, setLanguage] = useState(initial?.settings.language ?? DEFAULT_SETTINGS.language)
  const [moderation, setModeration] = useState(initial?.settings.moderation ?? false)
  const [maxVideo, setMaxVideo] = useState(initial?.settings.maxVideoSeconds ?? 30)
  const [kinds, setKinds] = useState<EntryKind[]>(initial?.settings.allowedKinds ?? DEFAULT_SETTINGS.allowedKinds)

  const field = 'h-11 rounded-xl border bg-bg px-3 outline-none focus:border-accent'

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void onSubmit({
          slug,
          title,
          subtitle,
          theme: { preset, accent: accent || undefined },
          settings: { language, moderation, maxVideoSeconds: maxVideo, allowedKinds: kinds },
        })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-2">Title</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-2">Slug (URL)</span>
          <input
            required
            pattern="[a-z0-9][a-z0-9-]{1,62}"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            className={field}
            disabled={Boolean(initial)}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-2">Subtitle</span>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={field} />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-2">Theme</span>
          <select value={preset} onChange={(e) => setPreset(e.target.value as typeof preset)} className={field}>
            <option value="classic-warm">Classic warm</option>
            <option value="modern-dark">Modern dark</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-2">Accent colour</span>
          <input type="color" value={accent || '#7a2f3a'} onChange={(e) => setAccent(e.target.value)} className="h-11 w-full rounded-xl border bg-bg p-1" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-2">Language</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'da')} className={field}>
            <option value="en">English</option>
            <option value="da">Dansk</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={moderation} onChange={(e) => setModeration(e.target.checked)} className="size-5 accent-accent" />
          <span>{t('host.moderation')} (new posts wait for approval)</span>
        </label>
        <label className="flex items-center gap-3">
          <span className="text-sm text-ink-2">Max video seconds</span>
          <input type="number" min={5} max={120} value={maxVideo} onChange={(e) => setMaxVideo(Number(e.target.value))} className={`${field} w-24`} />
        </label>
      </div>
      <fieldset className="flex flex-wrap gap-3">
        <legend className="mb-1 text-sm text-ink-2">Allowed entry types</legend>
        {KINDS.map((k) => (
          <label key={k} className="flex items-center gap-2 rounded-full border px-3 py-1.5 capitalize">
            <input
              type="checkbox"
              checked={kinds.includes(k)}
              onChange={(e) => setKinds((prev) => (e.target.checked ? [...prev, k] : prev.filter((x) => x !== k)))}
              className="accent-accent"
            />
            {k}
          </label>
        ))}
      </fieldset>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {t('host.save')}
        </Button>
      </div>
    </form>
  )
}
