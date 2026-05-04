import { useEffect, useState } from 'react'
import { formatVideoDuration } from '../../utils/videoUtils'
import './NoteCard.css'

const ROTATIONS = [-7.2, -5.4, -3.6, -2.1, 2.1, 3.6, 5.4, 7.2, -4.8, 4.8]
const TAPE_COLORS = ['#C9A84C', '#E8D48B', '#9B4D56', '#D4A574', '#A68A3E']
const NOTE_BACKGROUNDS = ['#FFF8B2', '#FFE6A8', '#FEE7C6', '#FBE3A3', '#FFE9D2', '#FFF4BE']

const seededValue = (seed, offset = 0) => {
  const x = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const buildSeed = (value, fallback) => {
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric !== 0) return numeric

  const text = String(value || fallback)
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash || fallback
}

export default function NoteCard({ message, index = 0, large = false }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')

  useEffect(() => {
    if (!(message.videoBlob instanceof Blob)) {
      setVideoUrl('')
      return undefined
    }

    const nextUrl = URL.createObjectURL(message.videoBlob)
    setVideoUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [message.videoBlob])
  
  const seed = buildSeed(message.id, index + 1)
  const rotation = large ? 0 : ROTATIONS[index % ROTATIONS.length] + (seededValue(seed, 1) - 0.5) * 2.6
  const tapeColor = TAPE_COLORS[index % TAPE_COLORS.length]
  const noteBg = NOTE_BACKGROUNDS[index % NOTE_BACKGROUNDS.length]
  const offsetX = large ? 0 : Math.round((seededValue(seed, 2) - 0.5) * 34)
  const offsetY = large ? 0 : Math.round((seededValue(seed, 3) - 0.5) * 40)
  const skew = large ? 0 : ((seededValue(seed, 4) - 0.5) * 1.8).toFixed(2)
  const cardWidth = large ? 520 : 270 + Math.round(seededValue(seed, 5) * 58)

  const timeStr = new Date(message.timestamp).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit'
  })

  // Validate photo is a proper data URL
  const hasPhoto = !photoFailed && typeof message.photoDataUrl === 'string' && message.photoDataUrl.startsWith('data:image/') && message.photoDataUrl.length > 100
  const hasVideoBlob = !hasPhoto && !!videoUrl
  const hasVideoThumbnail = !hasPhoto && typeof message.videoThumbnailDataUrl === 'string' && message.videoThumbnailDataUrl.startsWith('data:image/') && message.videoThumbnailDataUrl.length > 100
  const hasVideo = hasVideoBlob || hasVideoThumbnail

  return (
    <div
      className={`note-card ${large ? 'note-card--large' : ''}`}
      style={{
        '--rotation': `${rotation}deg`,
        '--tape-color': tapeColor,
        '--note-bg': noteBg,
        '--offset-x': `${offsetX}px`,
        '--offset-y': `${offsetY}px`,
        '--skew': `${skew}deg`,
        '--card-width': `${cardWidth}px`
      }}
    >
      <div className="note-tape" />
      {(hasPhoto || hasVideo) && (
        <div className="note-photo-wrapper note-media-wrapper">
          {hasPhoto ? (
            <img
              src={message.photoDataUrl}
              alt={`Photo by ${message.name}`}
              className="note-photo"
              loading="lazy"
              onError={(event) => {
                console.error(`[NoteCard] Failed to load media for "${message.name}":`, event.error)
                setPhotoFailed(true)
              }}
            />
          ) : hasVideoBlob ? (
            <video
              src={videoUrl}
              className="note-photo"
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={message.videoThumbnailDataUrl}
              alt={`Video message by ${message.name}`}
              className="note-photo"
              loading="lazy"
              onError={() => {
                setPhotoFailed(true)
              }}
            />
          )}
          {hasVideo && (
            <>
              <span className="note-media-badge">▶ Video Message</span>
              <span className="note-media-duration">{formatVideoDuration(message.videoDuration)}</span>
            </>
          )}
        </div>
      )}
      <div className="note-content">
        <p className="note-message">{message.message}</p>
        {message.emojis && <p className="note-emojis">{message.emojis}</p>}
      </div>
      <div className="note-footer">
        <span className="note-author">— {message.name || 'Anonymous'}</span>
        <span className="note-time">{timeStr}</span>
      </div>
    </div>
  )
}
