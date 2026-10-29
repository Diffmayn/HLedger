import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EventRow, Json } from '@/types/database'
import { mapEvent, type EventSettings, type EventTheme, type GuestbookEvent } from '@/types/domain'

export const eventKey = (slug: string) => ['event', slug] as const
export const myEventsKey = ['events', 'mine'] as const

export async function fetchEventBySlug(slug: string): Promise<GuestbookEvent | null> {
  const { data, error } = await supabase().from('events').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data ? mapEvent(data as EventRow) : null
}

export function useEvent(slug: string | undefined) {
  return useQuery({
    queryKey: eventKey(slug ?? ''),
    queryFn: () => fetchEventBySlug(slug!),
    enabled: Boolean(slug),
    staleTime: 5 * 60_000,
  })
}

export function useMyEvents(enabled: boolean) {
  return useQuery({
    queryKey: myEventsKey,
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as EventRow[]).map(mapEvent)
    },
    enabled,
  })
}

export interface EventInput {
  slug: string
  title: string
  subtitle?: string
  theme?: EventTheme
  settings?: Partial<EventSettings>
  startsAt?: string | null
  endsAt?: string | null
}

export function useUpsertEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id?: string; input: EventInput }) => {
      const session = (await supabase().auth.getSession()).data.session
      if (!session) throw new Error('Sign in to manage events.')
      const payload = {
        slug: vars.input.slug.trim().toLowerCase(),
        title: vars.input.title.trim(),
        subtitle: vars.input.subtitle?.trim() ?? null,
        theme: (vars.input.theme ?? { preset: 'classic-warm' }) as unknown as Json,
        settings: (vars.input.settings ?? {}) as unknown as Json,
        starts_at: vars.input.startsAt ?? null,
        ends_at: vars.input.endsAt ?? null,
        owner: session.user.id,
      }
      const query = vars.id
        ? supabase().from('events').update(payload).eq('id', vars.id)
        : supabase().from('events').insert(payload)
      const { data, error } = await query.select('*').single()
      if (error) throw error
      return mapEvent(data as EventRow)
    },
    onSuccess: (event) => {
      qc.setQueryData(eventKey(event.slug), event)
      void qc.invalidateQueries({ queryKey: myEventsKey })
    },
  })
}
