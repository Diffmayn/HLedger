import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getClientId } from './clientId'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

function create(): SupabaseClient<Database> {
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    global: { headers: { 'x-client-id': getClientId() } },
    realtime: { params: { eventsPerSecond: 20 } },
  })
}

let client: SupabaseClient<Database> | null = null

export function supabase(): SupabaseClient<Database> {
  client ??= create()
  return client
}

export const MEDIA_BUCKET = 'media'

export function publicMediaUrl(path: string): string {
  return supabase().storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}
