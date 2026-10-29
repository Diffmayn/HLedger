import { useEffect, type ReactNode } from 'react'
import type { EventTheme } from '@/types/domain'

export function ThemeProvider({ theme, children }: { theme?: EventTheme; children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme?.preset ?? 'classic-warm'
    if (theme?.accent) root.style.setProperty('--t-accent', theme.accent)
    else root.style.removeProperty('--t-accent')
    if (theme?.background) root.style.setProperty('--t-bg', theme.background)
    else root.style.removeProperty('--t-bg')
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--t-bg').trim())
  }, [theme?.preset, theme?.accent, theme?.background])
  return <>{children}</>
}
