import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import './Sidebar.css'

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 769px)').matches)
  const location = useLocation()

  const isPresentation = location.pathname === '/present'

  useEffect(() => {
    const media = window.matchMedia('(min-width: 769px)')
    const handleChange = (event) => setIsDesktop(event.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const closeOnLeave = useMemo(() => {
    if (!isDesktop) return undefined
    return () => setIsOpen(false)
  }, [isDesktop])

  if (isPresentation) return null

  return (
    <>
      <button
        type="button"
        className={`sidebar-toggle ${isOpen ? 'sidebar-toggle--active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <aside
        className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}
        onMouseLeave={closeOnLeave}
      >
        <div className="sidebar-brand">
          <span className="sidebar-brand-star">✦</span>
          <h1>Jeannette's Guestbook</h1>
          <p>25 Years at Salling Group</p>
        </div>

        <nav className="sidebar-links" aria-label="Main navigation">
          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end>
            <span className="sidebar-icon">📖</span>
            <span>Guestbook</span>
          </NavLink>
          <NavLink to="/booth" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-icon">📸</span>
            <span>Photo Booth</span>
          </NavLink>
          <NavLink to="/export" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-icon">📕</span>
            <span>Export Book</span>
          </NavLink>
          <a href="/present" target="_blank" rel="noopener" className="sidebar-link sidebar-link-present">
            <span className="sidebar-icon">🖥️</span>
            <span>Presentation</span>
          </a>
        </nav>
      </aside>

      {isOpen && <button type="button" className="sidebar-backdrop" onClick={() => setIsOpen(false)} aria-label="Close menu" />}
    </>
  )
}
