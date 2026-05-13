import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import MainWall from './components/Wall/MainWall'

const PresentationWall = lazy(() => import('./components/Wall/PresentationWall'))
const PhotoBooth = lazy(() => import('./components/PhotoBooth/PhotoBooth'))
const ExportPage = lazy(() => import('./components/Export/ExportPage'))

function RouteFallback() {
  return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center', opacity: 0.7 }}>
      Loading…
    </div>
  )
}

export default function App() {
  return (
    <>
      <Sidebar />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<MainWall />} />
          <Route path="/present" element={<PresentationWall />} />
          <Route path="/booth" element={<PhotoBooth />} />
          <Route path="/export" element={<ExportPage />} />
        </Routes>
      </Suspense>
    </>
  )
}
