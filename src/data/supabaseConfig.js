export function normalizeEnvValue(value, envName) {
  if (typeof value !== 'string') return ''

  const trimmed = value.trim()
  const prefixedPattern = new RegExp(`^${envName}\\s*=\\s*`, 'i')
  const normalized = trimmed.replace(prefixedPattern, '').trim()
  return normalized.replace(/^['"]|['"]$/g, '')
}

export function getSupabaseConfig(env = import.meta.env) {
  const supabaseUrl = normalizeEnvValue(env?.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL')
  const supabaseAnonKey = normalizeEnvValue(env?.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY')

  return {
    supabaseUrl,
    supabaseAnonKey,
    isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey)
  }
}