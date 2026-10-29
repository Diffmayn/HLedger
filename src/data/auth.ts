import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    const client = supabase()
    void client.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  return session
}

export async function signInWithEmail(email: string, redirectTo: string) {
  const { error } = await supabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
  if (error) throw error
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase().auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  await supabase().auth.signOut()
}
