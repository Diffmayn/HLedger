import { useState } from 'react'
import { Link } from 'react-router'
import { LogOut, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/components/ui/toastStore'
import { signInWithEmail, signOut, useSession } from '@/data/auth'
import { useMyEvents, useUpsertEvent } from '@/data/events'
import { useT } from '@/i18n'
import { EventForm } from './EventForm'

export default function HostHome() {
  const session = useSession()
  const t = useT()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [creating, setCreating] = useState(false)
  const events = useMyEvents(Boolean(session))
  const upsert = useUpsertEvent()

  if (session === undefined) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center gap-6 p-6">
        <h1 className="text-3xl">{t('host.signIn')}</h1>
        {sent ? (
          <p className="rounded-2xl bg-surface p-4 text-ink-2">{t('host.linkSent')}</p>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await signInWithEmail(email, `${window.location.origin}${import.meta.env.BASE_URL}host`)
                setSent(true)
              } catch (err) {
                toast.error((err as Error).message)
              }
            }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm text-ink-2">{t('host.email')}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border bg-surface px-4 outline-none focus:border-accent"
                autoComplete="email"
              />
            </label>
            <Button type="submit" size="lg">
              {t('host.sendLink')}
            </Button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl">{t('host.events')}</h1>
          <p className="text-sm text-ink-3">{session.user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> {t('host.newEvent')}
          </Button>
          <Button variant="ghost" onClick={() => void signOut()} aria-label={t('host.signOut')}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      {creating && (
        <div className="mb-6 rounded-card bg-surface p-5 shadow-card">
          <EventForm
            submitting={upsert.isPending}
            onCancel={() => setCreating(false)}
            onSubmit={async (input) => {
              try {
                await upsert.mutateAsync({ input })
                setCreating(false)
              } catch (e) {
                toast.error((e as Error).message)
              }
            }}
          />
        </div>
      )}

      {events.isLoading ? (
        <Spinner />
      ) : (
        <ul className="grid gap-3">
          {(events.data ?? []).map((ev) => (
            <li key={ev.id} className="flex items-center justify-between rounded-card bg-surface p-4 shadow-card">
              <div>
                <p className="font-display text-xl">{ev.title}</p>
                <p className="text-sm text-ink-3">/{ev.slug}</p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link to={`/${ev.slug}/host`}>Open</Link>
              </Button>
            </li>
          ))}
          {events.data?.length === 0 && !creating && <p className="text-ink-2">No events yet.</p>}
        </ul>
      )}
    </div>
  )
}
