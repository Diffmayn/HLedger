import './FilterAdjustments.css'

function percentValue(value, fallback = 1) {
  return Math.round((value ?? fallback) * 100)
}

export default function FilterAdjustments({
  activeFilters,
  selectedFilterId,
  onSelectFilter,
  onUpdateFilter,
}) {
  if (!activeFilters.length) return null

  const selectedFilter = activeFilters.find((filter) => filter.id === selectedFilterId) || activeFilters[0]

  if (!selectedFilter) return null

  return (
    <div className="filter-adjustments">
      <div className="filter-adjustments-header">
        <div>
          <p className="filter-adjustments-eyebrow">Live filter mix</p>
          <h4>Tune your active filters</h4>
        </div>
        <button
          type="button"
          className="filter-adjustments-reset"
          onClick={() => onUpdateFilter(selectedFilter.id, {
            userScale: 1,
            opacity: selectedFilter.defaultOpacity ?? 1,
          })}
        >
          Reset selected
        </button>
      </div>

      <div className="filter-adjustments-pills">
        {activeFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`filter-adjustments-pill ${filter.id === selectedFilter.id ? 'active' : ''}`}
            onClick={() => onSelectFilter(filter.id)}
          >
            {filter.name}
          </button>
        ))}
      </div>

      <div className="filter-adjustments-grid">
        <label className="filter-adjustments-control">
          <span className="filter-adjustments-label">Size</span>
          <span className="filter-adjustments-value">{percentValue(selectedFilter.userScale)}%</span>
          <input
            type="range"
            min="70"
            max="145"
            step="1"
            value={percentValue(selectedFilter.userScale)}
            onChange={(event) => onUpdateFilter(selectedFilter.id, {
              userScale: Number(event.target.value) / 100,
            })}
          />
        </label>

        <label className="filter-adjustments-control">
          <span className="filter-adjustments-label">Blend</span>
          <span className="filter-adjustments-value">{percentValue(selectedFilter.opacity, selectedFilter.defaultOpacity)}%</span>
          <input
            type="range"
            min="35"
            max="100"
            step="1"
            value={percentValue(selectedFilter.opacity, selectedFilter.defaultOpacity)}
            onChange={(event) => onUpdateFilter(selectedFilter.id, {
              opacity: Number(event.target.value) / 100,
            })}
          />
        </label>
      </div>
    </div>
  )
}