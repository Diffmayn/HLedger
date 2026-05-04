import { useState } from 'react'
import { FILTERS } from './filterData'
import './FilterSelector.css'

export default function FilterSelector({ activeFilters, onToggle }) {
  const [activeCategory, setActiveCategory] = useState('hats')

  const categories = [
    { key: 'hats',        label: '🎩 Hats',        icon: '🎩' },
    { key: 'accessories', label: '🎀 Accessories',  icon: '🎀' },
    { key: 'faces',       label: '🎭 Faces',        icon: '🎭' },
  ]

  const currentFilters = FILTERS.filter(f => f.category === activeCategory)
  const activeIds = activeFilters.map(f => f.id)

  return (
    <div className="filter-selector">
      <div className="filter-categories">
        {categories.map(cat => (
          <button
            key={cat.key}
            className={`filter-cat-btn ${activeCategory === cat.key ? 'active' : ''}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setActiveCategory(cat.key)
            }}
          >
            <span className="filter-cat-icon">{cat.icon}</span>
            <span className="filter-cat-label">{cat.key}</span>
          </button>
        ))}
      </div>

      <div className="filter-items">
        {currentFilters.map(filter => (
          <button
            key={filter.id}
            className={`filter-item ${activeIds.includes(filter.id) ? 'active' : ''}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(filter)
            }}
            title={filter.name}
          >
            <img src={filter.thumbnail || filter.src} alt={filter.name} className="filter-thumb" />
            <span className="filter-name">{filter.name}</span>
          </button>
        ))}
      </div>

      {activeFilters.length > 0 && (
        <button type="button" className="filter-clear-btn" onClick={(e) => {
          e.stopPropagation()
          onToggle(null)
        }}>
          ✕ Clear All
        </button>
      )}
    </div>
  )
}
