import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SpeechRow } from '@/types/database'
import { mapSpeech, type Speech } from '@/types/domain'

export const speechKey = (eventId: string) => ['speech', eventId] as const

export function useSpeech(eventId: string | undefined) {
  return useQuery({
    queryKey: speechKey(eventId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('speech')
        .select('*')
        .eq('event_id', eventId!)
        .maybeSingle()
      if (error) throw error
      return data ? mapSpeech(data as SpeechRow) : null
    },
    enabled: Boolean(eventId),
  })
}

export function useSaveSpeech(eventId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Pick<Speech, 'title' | 'body' | 'author'>) => {
      if (!eventId) throw new Error('No event')
      const { data, error } = await supabase()
        .from('speech')
        .upsert(
          { event_id: eventId, ...input, updated_at: new Date().toISOString() },
          { onConflict: 'event_id' },
        )
        .select('*')
        .single()
      if (error) throw error
      return mapSpeech(data as SpeechRow)
    },
    onSuccess: (speech) => qc.setQueryData(speechKey(speech.eventId), speech),
  })
}
