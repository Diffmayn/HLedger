import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

vi.mock('@/lib/supabase', () => ({
  publicMediaUrl: (p: string) => `https://cdn/${p}`,
  supabase: () => {
    throw new Error('not used')
  },
  MEDIA_BUCKET: 'media',
}))

const { applyEntryChange, entriesKey } = await import('./entries')
const { applyReactionChange, reactionsKey, summarize } = await import('./reactions')
import type { Entry } from '@/types/domain'

function row(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    event_id: 'ev',
    kind: 'message',
    author_name: 'A',
    body: 'hi',
    emojis: '',
    media_path: null,
    thumb_path: null,
    mime: null,
    width: null,
    height: null,
    duration_ms: 0,
    filters_used: [],
    status: 'published',
    client_id: 'c',
    created_at: `2026-10-29T10:0${id}:00Z`,
    ...extra,
  }
}

describe('applyEntryChange', () => {
  it('inserts newest first, updates in place, deletes', () => {
    const qc = new QueryClient()
    qc.setQueryData<Entry[]>(entriesKey('ev'), [])
    applyEntryChange(qc, { eventType: 'INSERT', new: row('1'), old: {} })
    applyEntryChange(qc, { eventType: 'INSERT', new: row('2'), old: {} })
    expect(qc.getQueryData<Entry[]>(entriesKey('ev'))!.map((e) => e.id)).toEqual(['2', '1'])
    applyEntryChange(qc, { eventType: 'UPDATE', new: row('1', { body: 'edited' }), old: {} })
    expect(qc.getQueryData<Entry[]>(entriesKey('ev'))!.find((e) => e.id === '1')!.body).toBe('edited')
    applyEntryChange(qc, { eventType: 'DELETE', new: {}, old: { id: '2', event_id: 'ev' } })
    expect(qc.getQueryData<Entry[]>(entriesKey('ev'))!.map((e) => e.id)).toEqual(['1'])
  })
  it('drops hidden rows for viewers, keeps them for the owner', () => {
    const qc = new QueryClient()
    qc.setQueryData<Entry[]>(entriesKey('ev'), [])
    applyEntryChange(qc, { eventType: 'INSERT', new: row('1'), old: {} })
    applyEntryChange(qc, { eventType: 'UPDATE', new: row('1', { status: 'hidden' }), old: {} })
    expect(qc.getQueryData<Entry[]>(entriesKey('ev'))).toHaveLength(0)
    applyEntryChange(qc, { eventType: 'UPDATE', new: row('1', { status: 'hidden' }), old: {} }, true)
    expect(qc.getQueryData<Entry[]>(entriesKey('ev'))).toHaveLength(1)
  })
})

describe('reactions', () => {
  it('summarises counts per entry and dedupes realtime inserts', () => {
    const qc = new QueryClient()
    qc.setQueryData(reactionsKey('ev'), [])
    const r = { id: 'r1', event_id: 'ev', entry_id: 'x', emoji: '❤️', client_id: 'c', created_at: '' }
    applyReactionChange(qc, { eventType: 'INSERT', new: r, old: {} })
    applyReactionChange(qc, { eventType: 'INSERT', new: r, old: {} })
    const s = summarize(qc.getQueryData(reactionsKey('ev')))
    expect(s.get('x')?.counts['❤️']).toBe(1)
    applyReactionChange(qc, { eventType: 'DELETE', new: {}, old: { id: 'r1', event_id: 'ev' } })
    expect(summarize(qc.getQueryData(reactionsKey('ev'))).size).toBe(0)
  })
})
