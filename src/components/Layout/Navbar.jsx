import { NavLink, useLocation } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  const location = useLocation()
  const isPresentation = location.pathname === '/present'

  if (isPresentation) return null

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">✦</span>
        <div className="navbar-title">
          <h1>Jeannette's Guestbook</h1>
          <span className="navbar-subtitle">25 Years at Salling Group</span>
        </div>
      </div>
      <div className="navbar-links">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <span className="nav-icon">📖</span>
          <span>Guestbook</span>
        </NavLink>
        <NavLink to="/booth" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📸</span>
          <span>Photo Booth</span>
        </NavLink>
        <NavLink to="/export" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📕</span>
          <span>Export Book</span>
        </NavLink>
        <a href="/present" target="_blank" rel="noopener" className="nav-link nav-link-present">
          <span className="nav-icon">🖥️</span>
          <span>Presentation</span>
        </a>
      </div>
    </nav>
  )
}
