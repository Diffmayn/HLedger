import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useMessages, useBoothPhotos, useBoothVideos } from '../../hooks/useDatabase'
import useBroadcastChannel from '../../hooks/useBroadcastChannel'
import NoteCard from './NoteCard'
import BoothPhotoCard from './BoothPhotoCard'
import VideoEntryCard from './VideoEntryCard'
import './PresentationWall.css'

export default function PresentationWall() {
  const { messages } = useMessages()
  const { photos } = useBoothPhotos()
  const { videos } = useBoothVideos()
  const [slideshowActive, setSlideshowActive] = useState(false)
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const timerRef = useRef(null)

  const handleBroadcast = useCallback((event) => {
    if (event?.type?.startsWith('NEW_')) {
      setSlideshowIndex(0)
    }
  }, [])
  useBroadcastChannel(handleBroadcast)

  // Combined feed
  const allEntries = useMemo(() => {
    const items = []
    messages.forEach(m => items.push({ ...m, _type: 'message' }))
    photos.forEach(p => items.push({ ...p, _type: 'photo' }))
    videos.forEach(v => items.push({ ...v, _type: 'video' }))
    items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    return items
  }, [messages, photos, videos])

  // Slideshow auto-advance
  useEffect(() => {
    if (!slideshowActive || allEntries.length === 0) return
    timerRef.current = setInterval(() => {
      setSlideshowIndex(prev => (prev + 1) % allEntries.length)
    }, 6000)
    return () => clearInterval(timerRef.current)
  }, [slideshowActive, allEntries.length])

  // Toggle slideshow with 'S' key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 's' || e.key === 'S') {
        setSlideshowActive(prev => !prev)
        setSlideshowIndex(0)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const slideshowEntry = allEntries.length ? allEntries[slideshowIndex % allEntries.length] : null

  return (
    <div className="presentation-wall">
      <div className="presentation-header">
        <div className="presentation-sparkle">✦</div>
        <h1 className="presentation-title">Celebrating Jeannette</h1>
        <p className="presentation-subtitle">25 Years at Salling Group</p>
        <div className="presentation-divider" />
        <div className="presentation-counter">
          {messages.length} messages · {photos.length} photos · {videos.length} videos
          <button
            className="presentation-slideshow-toggle"
            onClick={() => { setSlideshowActive(!slideshowActive); setSlideshowIndex(0) }}
          >
            {slideshowActive ? '⏸ Stop Slideshow' : '▶ Start Slideshow'}
          </button>
        </div>
      </div>

      {/* Slideshow mode */}
      {slideshowActive && slideshowEntry && (
        <div className="presentation-slideshow">
          <div
            key={`${slideshowEntry._type}-${slideshowEntry.id}-${slideshowIndex}`}
            className="presentation-slideshow-card"
          >
            {slideshowEntry._type === 'message' ? (
              <NoteCard message={slideshowEntry} index={slideshowIndex} large />
            ) : slideshowEntry._type === 'photo' ? (
              <BoothPhotoCard photo={slideshowEntry} index={slideshowIndex} large />
            ) : (
              <VideoEntryCard video={slideshowEntry} index={slideshowIndex} large autoPlay />
            )}
          </div>
          <div className="presentation-slideshow-progress">
            <div
              className="presentation-slideshow-bar"
              style={{ width: `${((slideshowIndex + 1) / allEntries.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Grid mode */}
      {!slideshowActive && (
        <>
          {allEntries.length === 0 ? (
            <div className="presentation-empty">
              <p className="presentation-empty-text">Waiting for the first message...</p>
              <div className="presentation-empty-dots">
                <span>•</span><span>•</span><span>•</span>
              </div>
            </div>
          ) : (
            <div className="presentation-grid">
              {allEntries.map((entry, i) => (
                <div
                  key={`${entry._type}-${entry.id}`}
                  className="presentation-note fade-in-up"
                  style={{ animationDelay: `${Math.min(i * 0.05, 1)}s` }}
                >
                  {entry._type === 'message' ? (
                    <NoteCard message={entry} index={i} />
                  ) : entry._type === 'photo' ? (
                    <BoothPhotoCard photo={entry} index={i} />
                  ) : (
                    <VideoEntryCard video={entry} index={i} autoPlay />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="presentation-bg-decor">
        <div className="presentation-bg-circle c1" />
        <div className="presentation-bg-circle c2" />
        <div className="presentation-bg-circle c3" />
      </div>
    </div>
  )
}
