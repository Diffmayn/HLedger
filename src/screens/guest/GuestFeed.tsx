import { useState } from 'react'
import { Link } from 'react-router'
import { PenLine } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useEventContext } from '@/screens/shared/useEventContext'
import { useEntries } from '@/data/entries'
import { useReactionSummary, useToggleReaction } from '@/data/reactions'
import { EntryCard } from '@/screens/shared/EntryCard'
import { EntryDialog } from '@/screens/shared/EntryDialog'
import { useT } from '@/i18n'
import type { Entry } from '@/types/domain'

/** Phone-friendly feed with reactions; the TV wall is read-only. */
export default function GuestFeed() {
  const { event } = useEventContext()
  const t = useT()
  const { data: entries = [], isLoading } = useEntries(event.id)
  const reactions = useReactionSummary(event.id)
  const toggle = useToggleReaction(event.id)
  const [open, setOpen] = useState<Entry | null>(null)
  const published = entries.filter((e) => e.status === 'published')

  const onReact = (entry: Entry, emoji: string, active: boolean) =>
    toggle.mutate({ entryId: entry.id, emoji, active })

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 pt-6 safe-pb">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-ink-3">{event.subtitle || t('appName')}</p>
          <h1 className="text-3xl leading-tight">{event.title}</h1>
        </div>
        <Button asChild size="sm">
          <Link to="..">
            <PenLine className="size-4" /> {t('guest.another')}
          </Link>
        </Button>
      </header>
      {isLoading ? (
        <Spinner />
      ) : published.length === 0 ? (
        <p className="py-10 text-center text-ink-2">{t('wall.waiting')}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {published.map((entry) => (
            <li key={entry.id}>
              <EntryCard
                entry={entry}
                reactions={reactions.get(entry.id)}
                onReact={onReact}
                onOpen={setOpen}
                className="rotate-0 hover:rotate-0"
              />
            </li>
          ))}
        </ul>
      )}
      <EntryDialog entry={open} reactions={open ? reactions.get(open.id) : undefined} onClose={() => setOpen(null)} onReact={onReact} />
    </div>
  )
}
