import './BoothPhotoCard.css'

export default function BoothPhotoCard({ photo, index = 0, onClick, large = false }) {
  const timeStr = new Date(photo.timestamp).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const isStrip = !!photo.isStrip
  const isInteractive = typeof onClick === 'function'

  return (
    <div
      className={`booth-card${isStrip ? ' booth-card--strip' : ''}${large ? ' booth-card--large' : ''}${isInteractive ? '' : ' booth-card--static'}`}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={isInteractive ? 'View booth photo' : undefined}
    >
      <div className="booth-card-badge">📸</div>
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
