import { describe, expect, it } from 'vitest'
import { mapEntry, mapEvent } from './domain'
import type { EntryRow, EventRow } from './database'

const eventRow: EventRow = {
  id: 'e1',
  slug: 'demo',
  title: 'Demo',
  subtitle: null,
  theme: { preset: 'modern-dark', accent: '#fff' },
  settings: { moderation: true, maxVideoSeconds: 500, allowedKinds: ['photo', 'bogus'], language: 'da' },
  starts_at: null,
  ends_at: null,
  owner: 'u1',
  created_at: '2026-10-29T10:00:00Z',
}

describe('mapEvent', () => {
  it('normalises theme and settings with safe defaults', () => {
    const ev = mapEvent(eventRow)
    expect(ev.theme.preset).toBe('modern-dark')
    expect(ev.settings.moderation).toBe(true)
    expect(ev.settings.maxVideoSeconds).toBe(120)
    expect(ev.settings.allowedKinds).toEqual(['photo'])
    expect(ev.settings.language).toBe('da')
  })
  it('falls back when json is garbage', () => {
    const ev = mapEvent({ ...eventRow, theme: 'x', settings: [] })
    expect(ev.theme.preset).toBe('classic-warm')
    expect(ev.settings.allowedKinds).toHaveLength(4)
  })
})

describe('mapEntry', () => {
  it('resolves public urls from paths', () => {
    const row: EntryRow = {
      id: 'x',
      event_id: 'e1',
      kind: 'photo',
      author_name: 'A',
      body: '',
      emojis: '',
      media_path: 'e1/x/original.webp',
      thumb_path: 'e1/x/thumb.webp',
      mime: 'image/webp',
      width: 10,
      height: 10,
      duration_ms: 0,
      filters_used: ['top-hat'],
      status: 'published',
      client_id: 'c',
      created_at: '2026-10-29T10:00:00Z',
    }
    const e = mapEntry(row, (p) => `https://cdn/${p}`)
    expect(e.mediaUrl).toBe('https://cdn/e1/x/original.webp')
    expect(e.thumbUrl).toBe('https://cdn/e1/x/thumb.webp')
    expect(e.filtersUsed).toEqual(['top-hat'])
  })
})
