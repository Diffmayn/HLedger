import { useEffect, useMemo, useState } from 'react'
import { FILTERS } from './filterData'
import './FilterSelector.css'

const FAVORITES_KEY = 'guestbook-filter-favorites'
const RECENT_KEY = 'guestbook-filter-recent'

function readStoredList(key) {
  if (typeof window === 'undefined') return []

  try {
    const value = window.localStorage.getItem(key)
    const parsed = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredList(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export default function FilterSelector({ activeFilters, onToggle, selectedFilterId, onSelectActiveFilter }) {
  const [activeCategory, setActiveCategory] = useState('hats')
  const [searchValue, setSearchValue] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [recentIds, setRecentIds] = useState([])

  useEffect(() => {
    setFavorites(readStoredList(FAVORITES_KEY))
    setRecentIds(readStoredList(RECENT_KEY))
  }, [])

  useEffect(() => {
    writeStoredList(FAVORITES_KEY, favorites)
  }, [favorites])

  useEffect(() => {
    writeStoredList(RECENT_KEY, recentIds)
  }, [recentIds])

  const categories = [
    { key: 'hats',        label: 'Hats',         icon: '🎩' },
    { key: 'accessories', label: 'Accessories',  icon: '🎀' },
    { key: 'glasses',     label: 'Glasses',      icon: '🕶️' },
    { key: 'moustaches',  label: 'Moustaches',   icon: '🧔' },
    { key: 'faces',       label: 'Masks',        icon: '🎭' },
  ]

  const normalizedSearch = searchValue.trim().toLowerCase()
  const currentFilters = useMemo(() => FILTERS.filter((filter) => {
    if (filter.category !== activeCategory) return false
    if (favoritesOnly && !favorites.includes(filter.id)) return false
    if (!normalizedSearch) return true
    return filter.name.toLowerCase().includes(normalizedSearch)
  }), [activeCategory, favorites, favoritesOnly, normalizedSearch])

  const recentFilters = useMemo(() => recentIds
    .map((id) => FILTERS.find((filter) => filter.id === id))
    .filter(Boolean)
    .filter((filter) => !normalizedSearch || filter.name.toLowerCase().includes(normalizedSearch))
    .slice(0, 6), [normalizedSearch, recentIds])

  const activeIds = activeFilters.map(f => f.id)

  const toggleFavorite = (filterId) => {
    setFavorites((prev) => prev.includes(filterId)
      ? prev.filter((id) => id !== filterId)
      : [...prev, filterId])
  }

  const rememberRecent = (filterId) => {
    setRecentIds((prev) => [filterId, ...prev.filter((id) => id !== filterId)].slice(0, 10))
  }

  const handleToggle = (filter) => {
    rememberRecent(filter.id)
    onSelectActiveFilter?.(filter.id)
    onToggle(filter)
  }

  return (
    <div className="filter-selector">
      <div className="filter-toolbar">
        <label className="filter-search">
          <span className="filter-search-icon">⌕</span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search hats, glasses, masks..."
          />
        </label>

        <button
          type="button"
          className={`filter-favorites-toggle ${favoritesOnly ? 'active' : ''}`}
          onClick={() => setFavoritesOnly((prev) => !prev)}
        >
          ★ Favorites
        </button>
      </div>

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
            <span className="filter-cat-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {recentFilters.length > 0 && !favoritesOnly && !searchValue.trim() && (
        <div className="filter-recents">
          <span className="filter-section-label">Recently used</span>
          <div className="filter-recents-list">
            {recentFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`filter-recent-chip ${activeIds.includes(filter.id) ? 'active' : ''}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setActiveCategory(filter.category)
                  handleToggle(filter)
                }}
              >
                {filter.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="filter-active-strip">
          <span className="filter-section-label">Active now</span>
          <div className="filter-active-list">
            {activeFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`filter-active-chip ${selectedFilterId === filter.id ? 'active' : ''}`}
                onClick={() => onSelectActiveFilter?.(filter.id)}
              >
                {filter.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="filter-items">
        {currentFilters.map(filter => (
          <div
            key={filter.id}
            className={`filter-card ${activeIds.includes(filter.id) ? 'active' : ''} ${favorites.includes(filter.id) ? 'favorite' : ''}`}
          >
            <button
              className={`filter-item ${activeIds.includes(filter.id) ? 'active' : ''}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleToggle(filter)
              }}
              title={filter.name}
            >
              <img src={filter.thumbnail || filter.src} alt={filter.name} className="filter-thumb" />
              <span className="filter-name">{filter.name}</span>
            </button>
            <button
              type="button"
              className={`filter-favorite-btn ${favorites.includes(filter.id) ? 'active' : ''}`}
              aria-label={favorites.includes(filter.id) ? `Remove ${filter.name} from favorites` : `Add ${filter.name} to favorites`}
              onClick={(event) => {
                event.stopPropagation()
                toggleFavorite(filter.id)
              }}
            >
              ★
            </button>
          </div>
        ))}
      </div>

      {currentFilters.length === 0 && (
        <p className="filter-empty-state">
          {favoritesOnly
            ? 'No favorite filters match this category yet.'
            : `No filters matched “${searchValue.trim()}”.`}
        </p>
      )}

      {activeFilters.length > 0 && (
        <button type="button" className="filter-clear-btn" onClick={(e) => {
          e.stopPropagation()
          onSelectActiveFilter?.(null)
          onToggle(null)
        }}>
          ✕ Clear All
        </button>
      )}
    </div>
  )
}
