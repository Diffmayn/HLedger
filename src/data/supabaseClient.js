import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './supabaseConfig'

const { supabaseUrl, supabaseAnonKey, isSupabaseConfigured } = getSupabaseConfig()

export { isSupabaseConfigured }

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null
