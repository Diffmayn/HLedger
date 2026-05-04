import { useState } from 'react'
import './CameraFilters.css'

const CAMERA_FILTERS = [
  { id: 'none', name: 'Normal', icon: '🚫', css: 'none' },
  { id: 'vintage', name: 'Vintage', icon: '📷', css: 'sepia(0.4) contrast(1.1) brightness(1.05) saturate(0.8)' },
  { id: 'warm', name: 'Warm Glow', icon: '☀️', css: 'brightness(1.08) saturate(1.3) hue-rotate(-10deg)' },
  { id: 'cool', name: 'Cool', icon: '❄️', css: 'brightness(1.05) saturate(0.9) hue-rotate(15deg)' },
  { id: 'bw', name: 'B&W', icon: '🎬', css: 'grayscale(1) contrast(1.2) brightness(1.05)' },
  { id: 'retro', name: 'Retro', icon: '🌈', css: 'contrast(1.3) saturate(1.6) brightness(0.95)' },
  { id: 'dreamy', name: 'Dreamy', icon: '✨', css: 'brightness(1.15) contrast(0.85) saturate(1.2) blur(0.5px)' },
  { id: 'dramatic', name: 'Drama', icon: '🎭', css: 'contrast(1.5) brightness(0.9) saturate(0.7)' },
  { id: 'pop', name: 'Pop Art', icon: '🎨', css: 'saturate(2.5) contrast(1.4) brightness(1.1)' },
  { id: 'sunset', name: 'Sunset', icon: '🌅', css: 'sepia(0.25) saturate(1.4) hue-rotate(-15deg) brightness(1.05)' },
  { id: 'noir', name: 'Noir', icon: '🖤', css: 'grayscale(0.8) contrast(1.6) brightness(0.85)' },
  { id: 'party', name: 'Party', icon: '🎉', css: 'hue-rotate(30deg) saturate(1.8) brightness(1.1) contrast(1.1)' },
]

export default function CameraFilters({ activeFilter, onSelect }) {
  return (
    <div className="camera-filters">
      <div className="camera-filters-label">Camera Effects</div>
      <div className="camera-filters-list">
        {CAMERA_FILTERS.map(f => (
          <button
            key={f.id}
            className={`camera-filter-btn ${activeFilter === f.id ? 'active' : ''}`}
            type="button"
            onClick={() => onSelect(f.id === 'none' ? null : f)}
            title={f.name}
          >
            <span className="camera-filter-icon">{f.icon}</span>
            <span className="camera-filter-name">{f.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export { CAMERA_FILTERS }
