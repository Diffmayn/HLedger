import type { EntryKind, EntryRow, EntryStatus, EventRow, ReactionRow, SpeechRow } from './database'

export type ThemePreset = 'classic-warm' | 'modern-dark'

export interface EventTheme {
  preset: ThemePreset
  accent?: string
  background?: string
  logoUrl?: string
}

export interface EventSettings {
  moderation: boolean
  maxVideoSeconds: number
  allowedKinds: EntryKind[]
  language: 'en' | 'da'
}

export interface GuestbookEvent {
  id: string
  slug: string
  title: string
  subtitle: string
  theme: EventTheme
  settings: EventSettings
  startsAt: string | null
  endsAt: string | null
  owner: string
  createdAt: string
}

export interface Entry {
  id: string
  eventId: string
  kind: EntryKind
  authorName: string
  body: string
  emojis: string
  mediaUrl: string | null
  thumbUrl: string | null
  mediaPath: string | null
  thumbPath: string | null
  mime: string | null
  width: number | null
  height: number | null
  durationMs: number
  filtersUsed: string[]
  status: EntryStatus
  clientId: string
  createdAt: string
  /** True while the row only exists locally (optimistic / outbox). */
  pending?: boolean
}

export interface Reaction {
  id: string
  eventId: string
  entryId: string
  emoji: string
  clientId: string
  createdAt: string
}

export interface Speech {
  eventId: string
  title: string
  body: string
  author: string
  updatedAt: string
}

export const DEFAULT_SETTINGS: EventSettings = {
  moderation: false,
  maxVideoSeconds: 30,
  allowedKinds: ['message', 'photo', 'strip', 'video'],
  language: 'en',
}

export const DEFAULT_THEME: EventTheme = { preset: 'classic-warm' }

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function mapEvent(row: EventRow): GuestbookEvent {
  const theme = asObject(row.theme)
  const settings = asObject(row.settings)
  const allowedKinds = Array.isArray(settings.allowedKinds)
    ? (settings.allowedKinds.filter((k) =>
        ['message', 'photo', 'strip', 'video'].includes(String(k)),
      ) as EntryKind[])
    : DEFAULT_SETTINGS.allowedKinds
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? '',
    theme: {
      preset: theme.preset === 'modern-dark' ? 'modern-dark' : 'classic-warm',
      accent: typeof theme.accent === 'string' ? theme.accent : undefined,
      background: typeof theme.background === 'string' ? theme.background : undefined,
      logoUrl: typeof theme.logoUrl === 'string' ? theme.logoUrl : undefined,
    },
    settings: {
      moderation: settings.moderation === true,
      maxVideoSeconds:
        typeof settings.maxVideoSeconds === 'number' && settings.maxVideoSeconds > 0
          ? Math.min(settings.maxVideoSeconds, 120)
          : DEFAULT_SETTINGS.maxVideoSeconds,
      allowedKinds: allowedKinds.length ? allowedKinds : DEFAULT_SETTINGS.allowedKinds,
      language: settings.language === 'da' ? 'da' : 'en',
    },
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    owner: row.owner,
    createdAt: row.created_at,
  }
}

export function mapEntry(row: EntryRow, publicUrl: (path: string) => string): Entry {
  return {
    id: row.id,
    eventId: row.event_id,
    kind: row.kind,
    authorName: row.author_name ?? '',
    body: row.body ?? '',
    emojis: row.emojis ?? '',
    mediaPath: row.media_path,
    thumbPath: row.thumb_path,
    mediaUrl: row.media_path ? publicUrl(row.media_path) : null,
    thumbUrl: row.thumb_path ? publicUrl(row.thumb_path) : null,
    mime: row.mime,
    width: row.width,
    height: row.height,
    durationMs: row.duration_ms ?? 0,
    filtersUsed: Array.isArray(row.filters_used) ? row.filters_used : [],
    status: row.status,
    clientId: row.client_id,
    createdAt: row.created_at,
  }
}

export function mapReaction(row: ReactionRow): Reaction {
  return {
    id: row.id,
    eventId: row.event_id,
    entryId: row.entry_id,
    emoji: row.emoji,
    clientId: row.client_id,
    createdAt: row.created_at,
  }
}

export function mapSpeech(row: SpeechRow): Speech {
  return {
    eventId: row.event_id,
    title: row.title ?? '',
    body: row.body ?? '',
    author: row.author ?? '',
    updatedAt: row.updated_at,
  }
}
