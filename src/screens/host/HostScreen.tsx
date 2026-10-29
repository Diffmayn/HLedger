import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Copy, ExternalLink, Eye, EyeOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { useEventContext } from '@/screens/shared/useEventContext'
import { useDeleteEntry, useEntries, useSetEntryStatus } from '@/data/entries'
import { useSaveSpeech, useSpeech } from '@/data/speech'
import { useUpsertEvent } from '@/data/events'
import { useSession } from '@/data/auth'
import { EntryCard } from '@/screens/shared/EntryCard'
import { QrCode } from '@/screens/shared/QrCode'
import { eventUrl } from '@/lib/links'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import type { Entry } from '@/types/domain'
import { EventForm } from './EventForm'

type Tab = 'moderation' | 'links' | 'settings' | 'speech' | 'export'

export default function HostScreen() {
  const { event, isOwner } = useEventContext()
  const session = useSession()
  const t = useT()
  const [tab, setTab] = useState<Tab>('moderation')

  if (!session) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <p className="mb-4 text-ink-2">Sign in to manage this event.</p>
          <Button asChild>
            <Link to="/host">{t('host.signIn')}</Link>
          </Button>
        </div>
      </div>
    )
  }
  if (!isOwner) {
    return <div className="grid h-full place-items-center p-6 text-ink-2">You do not own this event.</div>
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'moderation', label: t('host.moderation') },
    { id: 'links', label: t('host.links') },
    { id: 'settings', label: 'Settings' },
    { id: 'speech', label: t('host.speech') },
    { id: 'export', label: t('host.export') },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-3">/{event.slug}</p>
          <h1 className="text-3xl">{event.title}</h1>
        </div>
        <nav className="flex gap-1 rounded-full bg-surface p-1 shadow-card" aria-label="Sections">
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              className={cn('rounded-full px-4 py-2 text-sm', tab === x.id ? 'bg-accent text-accent-ink' : 'text-ink-2 hover:bg-surface-2')}
              aria-current={tab === x.id}
            >
              {x.label}
            </button>
          ))}
        </nav>
      </header>
      {tab === 'moderation' && <Moderation />}
      {tab === 'links' && <Links />}
      {tab === 'settings' && <Settings />}
      {tab === 'speech' && <SpeechEditor />}
      {tab === 'export' && <ExportPanel />}
    </div>
  )
}

function Moderation() {
  const { event } = useEventContext()
  const t = useT()
  const { data: entries = [] } = useEntries(event.id)
  const setStatus = useSetEntryStatus()
  const del = useDeleteEntry()
  const [filter, setFilter] = useState<Entry['status']>('pending')
  const list = useMemo(() => entries.filter((e) => e.status === filter), [entries, filter])
  const counts = useMemo(
    () => ({
      pending: entries.filter((e) => e.status === 'pending').length,
      published: entries.filter((e) => e.status === 'published').length,
      hidden: entries.filter((e) => e.status === 'hidden').length,
    }),
    [entries],
  )

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <section>
      <div className="mb-4 flex gap-2">
        {(['pending', 'published', 'hidden'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn('rounded-full border px-4 py-2 text-sm', filter === s ? 'bg-ink text-bg' : 'bg-surface')}
          >
            {t(`host.${s}`)} · {counts[s]}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="text-ink-2">Nothing here.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-2">
              <EntryCard entry={entry} className="rotate-0" />
              <div className="flex gap-2">
                {entry.status !== 'published' && (
                  <Button size="sm" onClick={() => void act(() => setStatus.mutateAsync({ entry, status: 'published' }))}>
                    <Eye className="size-4" /> {entry.status === 'pending' ? t('host.publish') : t('host.restore')}
                  </Button>
                )}
                {entry.status === 'published' && (
                  <Button size="sm" variant="secondary" onClick={() => void act(() => setStatus.mutateAsync({ entry, status: 'hidden' }))}>
                    <EyeOff className="size-4" /> {t('host.hide')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => window.confirm(t('host.confirmDelete')) && void act(() => del.mutateAsync(entry))}
                >
                  <Trash2 className="size-4" /> {t('host.delete')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Links() {
  const { event } = useEventContext()
  const links = [
    { label: 'Guest (phone)', url: eventUrl(event.slug) },
    { label: 'Wall (TV)', url: eventUrl(event.slug, 'wall') },
    { label: 'Booth (tablet)', url: eventUrl(event.slug, 'booth') },
  ]
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {links.map((l) => (
        <div key={l.label} className="flex flex-col items-center gap-3 rounded-card bg-surface p-5 text-center shadow-card">
          <p className="font-display text-xl">{l.label}</p>
          <QrCode value={l.url} size={180} />
          <p className="break-all text-sm text-ink-3">{l.url}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => void navigator.clipboard.writeText(l.url).then(() => toast.success('Copied'))}>
              <Copy className="size-4" /> Copy
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href={l.url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> Open
              </a>
            </Button>
          </div>
        </div>
      ))}
      <p className="text-sm text-ink-3 sm:col-span-3">Print the guest QR for tables with the browser's print dialog on this page.</p>
    </section>
  )
}

function Settings() {
  const { event } = useEventContext()
  const upsert = useUpsertEvent()
  const t = useT()
  return (
    <section className="rounded-card bg-surface p-5 shadow-card">
      <EventForm
        initial={event}
        submitting={upsert.isPending}
        onSubmit={async (input) => {
          try {
            await upsert.mutateAsync({ id: event.id, input })
            toast.success(t('host.saved'))
          } catch (e) {
            toast.error((e as Error).message)
          }
        }}
      />
    </section>
  )
}

function SpeechEditor() {
  const { event } = useEventContext()
  const t = useT()
  const { data: speech } = useSpeech(event.id)
  const save = useSaveSpeech(event.id)
  const [title, setTitle] = useState<string | null>(null)
  const [author, setAuthor] = useState<string | null>(null)
  const [body, setBody] = useState<string | null>(null)
  const field = 'rounded-xl border bg-bg px-3 py-2 outline-none focus:border-accent'
  return (
    <form
      className="grid gap-4 rounded-card bg-surface p-5 shadow-card"
      onSubmit={async (e) => {
        e.preventDefault()
        try {
          await save.mutateAsync({ title: title ?? speech?.title ?? '', author: author ?? speech?.author ?? '', body: body ?? speech?.body ?? '' })
          toast.success(t('host.saved'))
        } catch (err) {
          toast.error((err as Error).message)
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <input className={field} placeholder="Title" value={title ?? speech?.title ?? ''} onChange={(e) => setTitle(e.target.value)} />
        <input className={field} placeholder="Author" value={author ?? speech?.author ?? ''} onChange={(e) => setAuthor(e.target.value)} />
      </div>
      <textarea className={`${field} min-h-[40vh] font-hand text-2xl`} value={body ?? speech?.body ?? ''} onChange={(e) => setBody(e.target.value)} placeholder="The speech, printed at the end of the book." />
      <div className="flex justify-end">
        <Button type="submit" loading={save.isPending}>{t('host.save')}</Button>
      </div>
    </form>
  )
}

function ExportPanel() {
  const { event } = useEventContext()
  const { data: entries = [] } = useEntries(event.id)
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name)
    try {
      await fn()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <ExportCard
        title="CSV"
        description="All published entries with media links."
        busy={busy === 'csv'}
        onClick={() => run('csv', async () => (await import('@/export/csv')).exportCsv(event, entries))}
      />
      <ExportCard
        title="ZIP of media"
        description="Every original photo, strip and video."
        busy={busy === 'zip'}
        onClick={() => run('zip', async () => (await import('@/export/zip')).exportZip(event, entries))}
      />
      <ExportCard
        title="Book PDF"
        description="A printable keepsake: messages, photos, speech."
        busy={busy === 'pdf'}
        onClick={() => run('pdf', async () => (await import('@/export/pdf')).exportBookPdf(event, entries))}
      />
    </section>
  )
}

function ExportCard({ title, description, busy, onClick }: { title: string; description: string; busy: boolean; onClick: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card">
      <p className="font-display text-xl">{title}</p>
      <p className="flex-1 text-sm text-ink-2">{description}</p>
      <Button onClick={onClick} loading={busy}>
        Download
      </Button>
    </div>
  )
}
