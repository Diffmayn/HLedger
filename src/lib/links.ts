export function eventUrl(slug: string, path: '' | 'wall' | 'booth' | 'host' = ''): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${base}/${slug}${path ? `/${path}` : ''}`
}
