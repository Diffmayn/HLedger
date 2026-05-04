import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import MainWall from './components/Wall/MainWall'
import PresentationWall from './components/Wall/PresentationWall'
import PhotoBooth from './components/PhotoBooth/PhotoBooth'
import ExportPage from './components/Export/ExportPage'

export default function App() {
  return (
    <>
      <Sidebar />
      <Routes>
        <Route path="/" element={<MainWall />} />
        <Route path="/present" element={<PresentationWall />} />
        <Route path="/booth" element={<PhotoBooth />} />
        <Route path="/export" element={<ExportPage />} />
      </Routes>
    </>
  )
}
