// Hand-maintained mirror of supabase/migrations. Regenerate with `npm run types`
// once the Supabase CLI is linked; keep the shape identical.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type EntryKind = 'message' | 'photo' | 'strip' | 'video'
export type EntryStatus = 'published' | 'hidden' | 'pending'

export interface EventRow {
  id: string
  slug: string
  title: string
  subtitle: string | null
  theme: Json
  settings: Json
  starts_at: string | null
  ends_at: string | null
  owner: string
  created_at: string
}

export interface EntryRow {
  id: string
  event_id: string
  kind: EntryKind
  author_name: string
  body: string
  emojis: string
  media_path: string | null
  thumb_path: string | null
  mime: string | null
  width: number | null
  height: number | null
  duration_ms: number
  filters_used: string[]
  status: EntryStatus
  client_id: string
  created_at: string
}

export interface ReactionRow {
  id: string
  event_id: string
  entry_id: string
  emoji: string
  client_id: string
  created_at: string
}

export interface SpeechRow {
  event_id: string
  title: string
  body: string
  author: string
  updated_at: string
}

type Insertable<T, Required extends keyof T, Optional extends keyof T = never> = Pick<T, Required> &
  Partial<Pick<T, Optional>>

export interface Database {
  public: {
    Tables: {
      events: {
        Row: EventRow
        Insert: Insertable<
          EventRow,
          'slug' | 'title' | 'owner',
          'id' | 'subtitle' | 'theme' | 'settings' | 'starts_at' | 'ends_at'
        >
        Update: Partial<EventRow>
        Relationships: []
      }
      entries: {
        Row: EntryRow
        Insert: Insertable<
          EntryRow,
          'event_id' | 'kind' | 'client_id',
          | 'id'
          | 'author_name'
          | 'body'
          | 'emojis'
          | 'media_path'
          | 'thumb_path'
          | 'mime'
          | 'width'
          | 'height'
          | 'duration_ms'
          | 'filters_used'
          | 'status'
        >
        Update: Partial<EntryRow>
        Relationships: []
      }
      reactions: {
        Row: ReactionRow
        Insert: Insertable<ReactionRow, 'event_id' | 'entry_id' | 'emoji' | 'client_id', 'id'>
        Update: Partial<ReactionRow>
        Relationships: []
      }
      speech: {
        Row: SpeechRow
        Insert: Insertable<SpeechRow, 'event_id', 'title' | 'body' | 'author' | 'updated_at'>
        Update: Partial<SpeechRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_event_owner: { Args: { p_event_id: string }; Returns: boolean }
    }
    Enums: { entry_kind: EntryKind; entry_status: EntryStatus }
    CompositeTypes: Record<string, never>
  }
}
