// Mirrors supabase/migrations in the shape `supabase gen types typescript` emits.
// Regenerate with `npm run types` once the CLI is linked; keep the shape identical.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type EntryKind = 'message' | 'photo' | 'strip' | 'video'
export type EntryStatus = 'published' | 'hidden' | 'pending'

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
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
        Insert: {
          id?: string
          slug: string
          title: string
          subtitle?: string | null
          theme?: Json
          settings?: Json
          starts_at?: string | null
          ends_at?: string | null
          owner: string
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          subtitle?: string | null
          theme?: Json
          settings?: Json
          starts_at?: string | null
          ends_at?: string | null
          owner?: string
          created_at?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
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
        Insert: {
          id?: string
          event_id: string
          kind: EntryKind
          author_name?: string
          body?: string
          emojis?: string
          media_path?: string | null
          thumb_path?: string | null
          mime?: string | null
          width?: number | null
          height?: number | null
          duration_ms?: number
          filters_used?: string[]
          status?: EntryStatus
          client_id: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          kind?: EntryKind
          author_name?: string
          body?: string
          emojis?: string
          media_path?: string | null
          thumb_path?: string | null
          mime?: string | null
          width?: number | null
          height?: number | null
          duration_ms?: number
          filters_used?: string[]
          status?: EntryStatus
          client_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'entries_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      reactions: {
        Row: {
          id: string
          event_id: string
          entry_id: string
          emoji: string
          client_id: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          entry_id: string
          emoji: string
          client_id: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          entry_id?: string
          emoji?: string
          client_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reactions_entry_id_fkey'
            columns: ['entry_id']
            isOneToOne: false
            referencedRelation: 'entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reactions_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      speech: {
        Row: {
          event_id: string
          title: string
          body: string
          author: string
          updated_at: string
        }
        Insert: {
          event_id: string
          title?: string
          body?: string
          author?: string
          updated_at?: string
        }
        Update: {
          event_id?: string
          title?: string
          body?: string
          author?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'speech_event_id_fkey'
            columns: ['event_id']
            isOneToOne: true
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_event_owner: {
        Args: { p_event_id: string }
        Returns: boolean
      }
    }
    Enums: {
      entry_kind: EntryKind
      entry_status: EntryStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type EventRow = Database['public']['Tables']['events']['Row']
export type EntryRow = Database['public']['Tables']['entries']['Row']
export type ReactionRow = Database['public']['Tables']['reactions']['Row']
export type SpeechRow = Database['public']['Tables']['speech']['Row']
