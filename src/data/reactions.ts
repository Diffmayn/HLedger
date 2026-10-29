import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getClientId } from '@/lib/clientId'
import type { ReactionRow } from '@/types/database'
import { mapReaction, type Reaction } from '@/types/domain'

export const reactionsKey = (eventId: string) => ['reactions', eventId] as const

export const REACTION_EMOJI = ['❤️', '🎉', '👏', '😂', '🥹', '🔥'] as const

export function useReactions(eventId: string | undefined) {
  return useQuery({
    queryKey: reactionsKey(eventId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('reactions')
        .select('*')
        .eq('event_id', eventId!)
        .limit(5000)
      if (error) throw error
      return (data as ReactionRow[]).map(mapReaction)
    },
    enabled: Boolean(eventId),
    staleTime: 60_000,
  })
}

export interface ReactionSummary {
  counts: Record<string, number>
  mine: Set<string>
  total: number
}

export function summarize(reactions: Reaction[] | undefined): Map<string, ReactionSummary> {
  const me = getClientId()
  const out = new Map<string, ReactionSummary>()
  for (const r of reactions ?? []) {
    let s = out.get(r.entryId)
    if (!s) {
      s = { counts: {}, mine: new Set(), total: 0 }
      out.set(r.entryId, s)
    }
    s.counts[r.emoji] = (s.counts[r.emoji] ?? 0) + 1
    s.total++
    if (r.clientId === me) s.mine.add(r.emoji)
  }
  return out
}

export function useReactionSummary(eventId: string | undefined) {
  const { data } = useReactions(eventId)
  return useMemo(() => summarize(data), [data])
}

export function applyReactionChange(
  qc: QueryClient,
  change: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: Partial<ReactionRow>; old: Partial<ReactionRow> },
) {
  if (change.eventType === 'DELETE') {
    const old = change.old
    if (!old.id || !old.event_id) return
    qc.setQueryData<Reaction[]>(reactionsKey(old.event_id), (prev = []) =>
      prev.filter((r) => r.id !== old.id),
    )
    return
  }
  const row = change.new as ReactionRow
  if (!row.id) return
  const reaction = mapReaction(row)
  qc.setQueryData<Reaction[]>(reactionsKey(reaction.eventId), (prev = []) =>
    prev.some((r) => r.id === reaction.id) ? prev : [...prev, reaction],
  )
}

export function useToggleReaction(eventId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { entryId: string; emoji: string; active: boolean }) => {
      if (!eventId) throw new Error('No event')
      const clientId = getClientId()
      if (vars.active) {
        const { error } = await supabase()
          .from('reactions')
          .delete()
          .eq('entry_id', vars.entryId)
          .eq('emoji', vars.emoji)
          .eq('client_id', clientId)
        if (error) throw error
        return null
      }
      const { data, error } = await supabase()
        .from('reactions')
        .insert({ event_id: eventId, entry_id: vars.entryId, emoji: vars.emoji, client_id: clientId })
        .select('*')
        .single()
      if (error) {
        if (error.code === '23505') return null // already there
        throw error
      }
      return mapReaction(data as ReactionRow)
    },
    onMutate: async (vars) => {
      if (!eventId) return
      const clientId = getClientId()
      const key = reactionsKey(eventId)
      const previous = qc.getQueryData<Reaction[]>(key) ?? []
      qc.setQueryData<Reaction[]>(key, (prev = []) =>
        vars.active
          ? prev.filter(
              (r) => !(r.entryId === vars.entryId && r.emoji === vars.emoji && r.clientId === clientId),
            )
          : [
              ...prev,
              {
                id: `local-${crypto.randomUUID()}`,
                eventId,
                entryId: vars.entryId,
                emoji: vars.emoji,
                clientId,
                createdAt: new Date().toISOString(),
              },
            ],
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (eventId && ctx?.previous) qc.setQueryData(reactionsKey(eventId), ctx.previous)
    },
    onSuccess: (reaction) => {
      if (!eventId || !reaction) return
      qc.setQueryData<Reaction[]>(reactionsKey(eventId), (prev = []) => [
        ...prev.filter(
          (r) => !(r.id.startsWith('local-') && r.entryId === reaction.entryId && r.emoji === reaction.emoji),
        ),
        reaction,
      ])
    },
  })
}
