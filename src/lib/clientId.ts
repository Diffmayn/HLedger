const KEY = 'hledger.clientId'

let cached: string | null = null

/** Stable anonymous id per browser; used for rate limiting and "my reactions". */
export function getClientId(): string {
  if (cached) return cached
  try {
    const existing = localStorage.getItem(KEY)
    if (existing) return (cached = existing)
  } catch {
    /* storage unavailable */
  }
  const id = crypto.randomUUID()
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* ignore */
  }
  return (cached = id)
}
