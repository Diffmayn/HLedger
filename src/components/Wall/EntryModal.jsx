import { useEffect, useState } from 'react'
import { useReactions } from '../../hooks/useDatabase'
import { formatVideoDuration } from '../../utils/videoUtils'
import './EntryModal.css'

const REACTION_EMOJIS = ['❤️', '🎉', '😂', '👏', '🥰', '🔥']

export default function EntryModal({ entry, type, onClose, onDelete }) {
  const { addReaction, getReactionsFor } = useReactions()
  const [justReacted, setJustReacted] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')

  const reactionCounts = getReactionsFor(type, entry.id)
  const isMessage = type === 'message'
  const isVideoEntry = type === 'video'
  const videoBlob = entry.videoBlob || null
  const hasVideo = !!videoBlob
  const photoSrc = hasVideo ? null : entry.photoDataUrl

  useEffect(() => {
    if (!videoBlob) {
      setVideoUrl('')
      return undefined
    }

    const nextUrl = URL.createObjectURL(videoBlob)
    setVideoUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [videoBlob])

  const handleReaction = async (emoji) => {
    await addReaction(type, entry.id, emoji)
    setJustReacted(emoji)
    setTimeout(() => setJustReacted(null), 600)
  }

  const timeStr = entry.timestamp
    ? new Date(entry.timestamp).toLocaleDateString('da-DK', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : ''

  return (
    <div className="entry-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="entry-modal" role="dialog" aria-labelledby="entry-modal-title">
        <button className="entry-modal-close" onClick={onClose} aria-label="Close">✕</button>

        {photoSrc && (
          <div className="entry-modal-photo">
            <img src={photoSrc} alt={isMessage ? `Photo by ${entry.name}` : 'Booth photo'} />
          </div>
        )}

        {hasVideo && videoUrl && (
          <div className="entry-modal-photo">
            <video src={videoUrl} controls playsInline autoPlay={isVideoEntry} />
          </div>
        )}

        <div className="entry-modal-body">
          {isMessage && (
            <>
              <p className="entry-modal-message" id="entry-modal-title">{entry.message}</p>
              {entry.emojis && <p className="entry-modal-emojis">{entry.emojis}</p>}
              {hasVideo && <p className="entry-modal-time">Video length: {formatVideoDuration(entry.videoDuration)}</p>}
              <p className="entry-modal-author">— {entry.name}</p>
            </>
          )}
          {!isMessage && !isVideoEntry && (
            <p className="entry-modal-author" id="entry-modal-title">Photo Booth Capture</p>
          )}
          {isVideoEntry && (
            <>
              <p className="entry-modal-author" id="entry-modal-title">Booth Video</p>
              <p className="entry-modal-time">Length: {formatVideoDuration(entry.videoDuration)}</p>
            </>
          )}
          {timeStr && <p className="entry-modal-time">{timeStr}</p>}
        </div>

        {/* Reactions */}
        <div className="entry-modal-reactions">
          <div className="reaction-buttons">
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                className={`reaction-btn ${justReacted === emoji ? 'reaction-btn--pop' : ''}`}
                onClick={() => handleReaction(emoji)}
                aria-label={`React with ${emoji}`}
              >
                <span className="reaction-emoji">{emoji}</span>
                {reactionCounts[emoji] > 0 && (
                  <span className="reaction-count">{reactionCounts[emoji]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {onDelete && (
          <div className="entry-modal-footer">
            <button className="entry-modal-delete" onClick={() => { onDelete(type, entry.id); onClose() }}>
              🗑️ Remove this entry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
