import { createClient } from '@supabase/supabase-js'

function normalizeEnvValue(value, envName) {
  if (typeof value !== 'string') return ''

  const trimmed = value.trim().replace(/^['"]|['"]$/g, '')
  const prefixedPattern = new RegExp(`^${envName}\\s*=\\s*`, 'i')
  const normalized = trimmed.replace(prefixedPattern, '').trim()

  return normalized
}

const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL')
const supabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY')

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null
