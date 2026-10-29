import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import { createQueryClient } from '@/lib/queryClient'
import { App } from '@/App'
import './index.css'

const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/'
const queryClient = createQueryClient()

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={base}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
