import { Outlet, useParams } from 'react-router'
import { BookOpen } from 'lucide-react'
import { useEffect } from 'react'
import { useEvent } from '@/data/events'
import { useEventRealtime } from '@/data/realtime'
import { useOutboxFlush } from '@/data/entries'
import { useSession } from '@/data/auth'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useI18nStore, useT } from '@/i18n'
import type { GuestbookEvent } from '@/types/domain'

export interface EventContext {
  event: GuestbookEvent
  isOwner: boolean
}

export function EventLayout() {
  const { slug } = useParams<{ slug: string }>()
  const { data: event, isLoading, error } = useEvent(slug)
  const session = useSession()
  const isOwner = Boolean(event && session && session.user.id === event.owner)
  const t = useT()
  const setLang = useI18nStore((s) => s.setLang)

  useEventRealtime(event?.id, { isOwner })
  useOutboxFlush(event?.id)

  useEffect(() => {
    if (event) {
      setLang(event.settings.language)
      document.title = `${event.title} · ${t('appName')}`
    }
  }, [event, setLang, t])

  if (isLoading || session === undefined) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner label={t('loading')} />
      </div>
    )
  }
  if (error || !event) {
    return (
      <EmptyState icon={<BookOpen />} title={t('eventNotFound')} className="h-full">
        {error ? String((error as Error).message) : null}
      </EmptyState>
    )
  }
  return (
    <ThemeProvider theme={event.theme}>
      <Outlet context={{ event, isOwner } satisfies EventContext} />
    </ThemeProvider>
  )
}
