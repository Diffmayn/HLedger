import { useState, useEffect } from 'react'
import { formatVideoDuration } from '../../utils/videoUtils'
import './VideoEntryCard.css'

export default function VideoEntryCard({ video, index = 0, onClick, large = false, autoPlay = false }) {
  const [videoUrl, setVideoUrl] = useState('')
  
  useEffect(() => {
    if (!autoPlay || !video.videoBlob) {
      setVideoUrl('')
      return undefined
    }

    const url = URL.createObjectURL(video.videoBlob)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [autoPlay, video.videoBlob])

  const timeStr = new Date(video.timestamp).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit'
  })
  const isInteractive = typeof onClick === 'function'

  return (
    <div
      className={`video-entry-card${large ? ' video-entry-card--large' : ''}${isInteractive ? '' : ' video-entry-card--static'}`}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={isInteractive ? 'View saved video' : undefined}
    >
      <div className="video-entry-badge">🎥</div>
      <div className="video-entry-thumb-wrap">
        {autoPlay && videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            playsInline
            muted
            loop
            preload="metadata"
            controls={false}
            className="video-entry-player"
            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'contain', background: '#000' }}
          />
        ) : video.videoThumbnailDataUrl ? (
          <img
            src={video.videoThumbnailDataUrl}
            alt={video.title || video.caption || 'Recorded video thumbnail'}
            className="video-entry-thumb"
            loading="lazy"
          />
        ) : (
          <div className="video-entry-thumb video-entry-thumb--empty">No preview</div>
        )}
        {!autoPlay && <div className="video-entry-play">▶</div>}
        {!autoPlay && video.videoDuration > 0 && (
          <div className="video-entry-duration">{formatVideoDuration(video.videoDuration)}</div>
        )}
      </div>
      {!autoPlay && (
        <div className="video-entry-footer">
          <span className="video-entry-label">{video.source === 'booth' ? 'Booth Video' : 'Video Message'}</span>
          <span className="video-entry-time">{timeStr}</span>
        </div>
      )}
    </div>
  )
}