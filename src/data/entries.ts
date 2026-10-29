import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { MEDIA_BUCKET, publicMediaUrl, supabase } from '@/lib/supabase'
import { getClientId } from '@/lib/clientId'
import { extensionForMime } from '@/lib/media'
import type { EntryRow } from '@/types/database'
import { mapEntry, type Entry } from '@/types/domain'
import type { EntryKind } from '@/types/database'
import { enqueueOutbox, type OutboxItem } from '@/lib/outbox'

export const entriesKey = (eventId: string) => ['entries', eventId] as const

const PAGE = 200

export async function fetchEntries(eventId: string): Promise<Entry[]> {
  const { data, error } = await supabase()
    .from('entries')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(PAGE)
  if (error) throw error
  return (data as EntryRow[]).map((r) => mapEntry(r, publicMediaUrl))
}

export function useEntries(eventId: string | undefined) {
  return useQuery({
    queryKey: entriesKey(eventId ?? ''),
    queryFn: () => fetchEntries(eventId!),
    enabled: Boolean(eventId),
    staleTime: 60_000,
  })
}

// ---------------------------------------------------------------------------
// Cache patching (used by realtime and by optimistic inserts)
// ---------------------------------------------------------------------------
export function upsertEntryInCache(qc: QueryClient, entry: Entry) {
  qc.setQueryData<Entry[]>(entriesKey(entry.eventId), (prev = []) => {
    const rest = prev.filter((e) => e.id !== entry.id)
    const next = [entry, ...rest]
    next.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return next
  })
}

export function removeEntryFromCache(qc: QueryClient, eventId: string, id: string) {
  qc.setQueryData<Entry[]>(entriesKey(eventId), (prev = []) => prev.filter((e) => e.id !== id))
}

export function applyEntryChange(
  qc: QueryClient,
  change: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: Partial<EntryRow>; old: Partial<EntryRow> },
  viewerIsOwner = false,
) {
  if (change.eventType === 'DELETE') {
    const old = change.old
    if (old.id && old.event_id) removeEntryFromCache(qc, old.event_id, old.id)
    return
  }
  const row = change.new as EntryRow
  if (!row.id || !row.event_id) return
  const entry = mapEntry(row, publicMediaUrl)
  if (entry.status !== 'published' && !viewerIsOwner) {
    removeEntryFromCache(qc, entry.eventId, entry.id)
    return
  }
  upsertEntryInCache(qc, entry)
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export interface CreateEntryInput {
  eventId: string
  kind: EntryKind
  authorName?: string
  body?: string
  emojis?: string
  media?: { blob: Blob; mime: string; width: number; height: number; durationMs?: number }
  thumb?: Blob
  filtersUsed?: string[]
}

export class EntryUploadError extends Error {
  constructor(
    message: string,
    public readonly code: 'rate_limited' | 'upload' | 'insert' | 'offline',
  ) {
    super(message)
  }
}

const RESUMABLE_THRESHOLD = 6 * 1024 * 1024

async function uploadBlob(path: string, blob: Blob, mime: string, onProgress?: (p: number) => void) {
  const storage = supabase().storage.from(MEDIA_BUCKET)
  if (blob.size <= RESUMABLE_THRESHOLD) {
    const { error } = await storage.upload(path, blob, { contentType: mime, upsert: false })
    if (error) throw new EntryUploadError(error.message, 'upload')
    onProgress?.(1)
    return
  }
  // Resumable (TUS) upload for large videos.
  const { Upload } = await import('tus-js-client')
  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`
  const session = (await supabase().auth.getSession()).data.session
  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(blob, {
      endpoint: url,
      retryDelays: [0, 1000, 3000, 5000],
      chunkSize: 6 * 1024 * 1024,
      headers: {
        authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: MEDIA_BUCKET, objectName: path, contentType: mime },
      onError: (e) => reject(new EntryUploadError(e.message, 'upload')),
      onProgress: (sent, total) => onProgress?.(sent / total),
      onSuccess: () => resolve(),
    })
    void upload.findPreviousUploads().then((prev) => {
      if (prev.length && prev[0]) upload.resumeFromPreviousUpload(prev[0])
      upload.start()
    })
  })
}

export async function createEntry(
  input: CreateEntryInput,
  onProgress?: (p: number) => void,
): Promise<Entry> {
  const id = crypto.randomUUID()
  let mediaPath: string | null = null
  let thumbPath: string | null = null

  if (input.media) {
    const ext = extensionForMime(input.media.mime)
    mediaPath = `${input.eventId}/${id}/original.${ext}`
    await uploadBlob(mediaPath, input.media.blob, input.media.mime, onProgress)
    if (input.thumb) {
      const text = input.thumb.type || 'image/jpeg'
      thumbPath = `${input.eventId}/${id}/thumb.${extensionForMime(text)}`
      await uploadBlob(thumbPath, input.thumb, text)
    }
  }

  const { data, error } = await supabase()
    .from('entries')
    .insert({
      id,
      event_id: input.eventId,
      kind: input.kind,
      author_name: (input.authorName ?? '').trim().slice(0, 80),
      body: (input.body ?? '').trim().slice(0, 2000),
      emojis: input.emojis ?? '',
      media_path: mediaPath,
      thumb_path: thumbPath,
      mime: input.media?.mime ?? null,
      width: input.media?.width ?? null,
      height: input.media?.height ?? null,
      duration_ms: input.media?.durationMs ?? 0,
      filters_used: input.filtersUsed ?? [],
      client_id: getClientId(),
    })
    .select('*')
    .single()

  if (error) {
    if (error.message.includes('rate_limited')) {
      throw new EntryUploadError('Please wait a few seconds before posting again.', 'rate_limited')
    }
    throw new EntryUploadError(error.message, 'insert')
  }
  return mapEntry(data as EntryRow, publicMediaUrl)
}

export function useCreateEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { input: CreateEntryInput; onProgress?: (p: number) => void }) =>
      createEntry(vars.input, vars.onProgress),
    onSuccess: (entry) => upsertEntryInCache(qc, entry),
    onError: async (err, vars) => {
      // Offline or transient network failure: park it in the outbox and retry later.
      if (!navigator.onLine || (err instanceof TypeError && /fetch/i.test(err.message))) {
        const item: OutboxItem = { id: crypto.randomUUID(), createdAt: Date.now(), input: vars.input }
        await enqueueOutbox(item)
        throw new EntryUploadError('You are offline. Your post is saved and will be sent.', 'offline')
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Host moderation
// ---------------------------------------------------------------------------
export function useSetEntryStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { entry: Entry; status: Entry['status'] }) => {
      const { data, error } = await supabase()
        .from('entries')
        .update({ status: vars.status })
        .eq('id', vars.entry.id)
        .select('*')
        .single()
      if (error) throw error
      return mapEntry(data as EntryRow, publicMediaUrl)
    },
    onSuccess: (entry) => upsertEntryInCache(qc, entry),
  })
}

export function useDeleteEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entry: Entry) => {
      const { error } = await supabase().from('entries').delete().eq('id', entry.id)
      if (error) throw error
      const paths = [entry.mediaPath, entry.thumbPath].filter((p): p is string => Boolean(p))
      if (paths.length) {
        // Best effort: the row is gone either way; orphaned files only cost storage.
        await supabase().storage.from(MEDIA_BUCKET).remove(paths).catch(() => undefined)
      }
      return entry
    },
    onSuccess: (entry) => removeEntryFromCache(qc, entry.eventId, entry.id),
  })
}

/** Flushes queued posts; call on `online` and on app start. */
export function useOutboxFlush(eventId: string | undefined) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!eventId) return
    let cancelled = false
    const flush = async () => {
      const { drainOutbox } = await import('@/lib/outbox')
      await drainOutbox(async (item) => {
        if (cancelled) return false
        const entry = await createEntry(item.input)
        upsertEntryInCache(qc, entry)
        return true
      })
    }
    void flush()
    window.addEventListener('online', flush)
    return () => {
      cancelled = true
      window.removeEventListener('online', flush)
    }
  }, [eventId, qc])
}
