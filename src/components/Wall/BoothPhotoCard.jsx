import { memo } from 'react'
import './BoothPhotoCard.css'

function BoothPhotoCard({ photo, index = 0, onClick, onDelete, large = false }) {
  const timeStr = new Date(photo.timestamp).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const isStrip = !!photo.isStrip
  const isInteractive = typeof onClick === 'function'

  const handleDelete = (e) => {
    e.stopPropagation()
    if (window.confirm('Delete this photo? This cannot be undone.')) {
      onDelete(photo.id)
    }
  }

  const handleClick = isInteractive ? () => onClick(photo) : undefined
  const handleKeyDown = isInteractive
    ? (e) => { if (e.key === 'Enter') onClick(photo) }
    : undefined

  return (
    <div
      className={`booth-card${isStrip ? ' booth-card--strip' : ''}${large ? ' booth-card--large' : ''}${isInteractive ? '' : ' booth-card--static'}`}
      onClick={handleClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={handleKeyDown}
      aria-label={isInteractive ? 'View booth photo' : undefined}
    >
      <div className="booth-card-badge">📸</div>
      {typeof onDelete === 'function' && (
        <button
          className="booth-card-delete"
          onClick={handleDelete}
          aria-label="Delete photo"
          title="Delete photo"
        >✕</button>
      )}
      <div className="booth-card-img-wrap">
        <img
          src={photo.photoDataUrl}
          alt={isStrip ? 'Photo strip' : 'Photo booth capture'}
          className="booth-card-img"
          loading="lazy"
        />
      </div>
      <div className="booth-card-footer">
        <span className="booth-card-label">{isStrip ? 'Photo Strip' : 'Photo Booth'}</span>
        <span className="booth-card-time">{timeStr}</span>
      </div>
    </div>
  )
}

export default memo(BoothPhotoCard)
