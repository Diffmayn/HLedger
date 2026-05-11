import { describe, expect, it } from 'vitest'
import { getSupabaseConfig, normalizeEnvValue } from './supabaseConfig'

describe('normalizeEnvValue', () => {
  it('returns an empty string for non-string values', () => {
    expect(normalizeEnvValue(undefined, 'VITE_SUPABASE_URL')).toBe('')
    expect(normalizeEnvValue(null, 'VITE_SUPABASE_URL')).toBe('')
  })

  it('removes wrapping quotes and whitespace', () => {
    expect(normalizeEnvValue('  "https://example.supabase.co"  ', 'VITE_SUPABASE_URL')).toBe('https://example.supabase.co')
  })

  it('removes a pasted env key prefix', () => {
    expect(normalizeEnvValue('VITE_SUPABASE_ANON_KEY = "abc123"', 'VITE_SUPABASE_ANON_KEY')).toBe('abc123')
  })
})

describe('getSupabaseConfig', () => {
  it('marks config as enabled only when both values are present', () => {
    expect(
      getSupabaseConfig({
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'key'
      })
    ).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'key',
      isSupabaseConfigured: true
    })

    expect(
      getSupabaseConfig({
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: ''
      }).isSupabaseConfigured
    ).toBe(false)
  })
})