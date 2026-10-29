import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { Toaster } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'
import { EventLayout } from '@/screens/shared/EventLayout'
import { isSupabaseConfigured } from '@/lib/supabase'
import { NotConfigured } from '@/screens/shared/NotConfigured'
import { Landing } from '@/screens/shared/Landing'

const GuestScreen = lazy(() => import('@/screens/guest/GuestScreen'))
const WallScreen = lazy(() => import('@/screens/wall/WallScreen'))
const BoothScreen = lazy(() => import('@/screens/booth/BoothScreen'))
const HostScreen = lazy(() => import('@/screens/host/HostScreen'))
const HostHome = lazy(() => import('@/screens/host/HostHome'))

function Fallback() {
  return (
    <div className="grid h-full place-items-center">
      <Spinner />
    </div>
  )
}

export function App() {
  if (!isSupabaseConfigured) return <NotConfigured />
  return (
    <>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/host" element={<HostHome />} />
          <Route path="/:slug" element={<EventLayout />}>
            <Route index element={<GuestScreen />} />
            <Route path="wall" element={<WallScreen />} />
            <Route path="booth" element={<BoothScreen />} />
            <Route path="host" element={<HostScreen />} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </>
  )
}
