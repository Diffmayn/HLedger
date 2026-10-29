import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { EntryRow, ReactionRow } from '@/types/database'
import { applyEntryChange } from './entries'
import { applyReactionChange } from './reactions'
import { speechKey } from './speech'

/**
 * One channel per screen. Changes are applied to the TanStack cache row by row;
 * nothing here refetches a table.
 */
export function useEventRealtime(eventId: string | undefined, options: { isOwner?: boolean } = {}) {
  const qc = useQueryClient()
  const isOwner = options.isOwner ?? false

  useEffect(() => {
    if (!eventId) return
    const channel = supabase()
      .channel(`event:${eventId}`)
      .on<EntryRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entries', filter: `event_id=eq.${eventId}` },
        (payload: RealtimePostgresChangesPayload<EntryRow>) => {
          applyEntryChange(
            qc,
            { eventType: payload.eventType, new: payload.new ?? {}, old: payload.old ?? {} },
            isOwner,
          )
        },
      )
      .on<ReactionRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions', filter: `event_id=eq.${eventId}` },
        (payload: RealtimePostgresChangesPayload<ReactionRow>) => {
          applyReactionChange(qc, {
            eventType: payload.eventType,
            new: payload.new ?? {},
            old: payload.old ?? {},
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'speech', filter: `event_id=eq.${eventId}` },
        () => void qc.invalidateQueries({ queryKey: speechKey(eventId) }),
      )
      .subscribe()

    // Realtime can miss events during a disconnect: refetch entries once on reconnect.
    const onOnline = () => void qc.invalidateQueries({ queryKey: ['entries', eventId] })
    window.addEventListener('online', onOnline)

    return () => {
      window.removeEventListener('online', onOnline)
      void supabase().removeChannel(channel)
    }
  }, [eventId, isOwner, qc])
}
