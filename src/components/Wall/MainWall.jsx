import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMessages, useBoothPhotos, useBoothVideos } from '../../hooks/useDatabase'
import useBroadcastChannel from '../../hooks/useBroadcastChannel'
import NoteCard from './NoteCard'
import BoothPhotoCard from './BoothPhotoCard'
import VideoEntryCard from './VideoEntryCard'
import EntryModal from './EntryModal'
import AddMessageModal from '../MessageForm/AddMessageModal'
import './MainWall.css'

const PAGE_SIZE = 24

export default function MainWall() {
  const { messages, addMessage, deleteMessage } = useMessages()
  const { photos: boothPhotos, deleteBoothPhoto } = useBoothPhotos()
  const { videos: boothVideos, deleteBoothVideo } = useBoothVideos()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const { broadcast } = useBroadcastChannel()
  const loadMoreRef = useRef(null)

  // Combine all entries into unified feed sorted by timestamp
  const allEntries = useMemo(() => {
    const items = []
    messages.forEach(m => items.push({ ...m, _type: 'message' }))
    boothPhotos.forEach(p => items.push({ ...p, _type: 'photo' }))
    boothVideos.forEach(v => items.push({ ...v, _type: 'video' }))
    items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    return items
  }, [messages, boothPhotos, boothVideos])

  // Lazy loaded slice
  const visibleEntries = useMemo(() => allEntries.slice(0, visibleCount), [allEntries, visibleCount])

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && visibleCount < allEntries.length) {
        setVisibleCount(prev => Math.min(prev + PAGE_SIZE, allEntries.length))
      }
    }, { rootMargin: '200px' })
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [allEntries.length, visibleCount])

  const handleSubmit = async (msg) => {
    try {
      const id = await addMessage(msg)
      broadcast('NEW_MESSAGE', { ...msg, id, timestamp: Date.now() })
      setShowModal(false)
      navigate('/')
    } catch (error) {
      throw new Error(error?.message || 'Failed to save message.')
    }
  }

  const handleDelete = useCallback(async (type, id) => {
    if (type === 'message') await deleteMessage(id)
    if (type === 'photo') await deleteBoothPhoto(id)
    if (type === 'video') await deleteBoothVideo(id)
  }, [deleteMessage, deleteBoothPhoto, deleteBoothVideo])

  const handleEntryClick = useCallback((entry) => {
    setSelectedEntry(entry)
  }, [])

  const notesWithPhotos = messages.filter(m => m.photoDataUrl).length

  return (
    <div className="main-wall">
      {/* Header */}
      <div className="wall-header">
        <h2 className="wall-title">✦ Jeannette's Guestbook ✦</h2>
        <p className="wall-subtitle">
          Celebrating 25 amazing years at Salling Group
        </p>
        <div className="wall-stats">
          <span className="wall-stat">{messages.length} messages</span>
          <span className="wall-stat-dot">·</span>
          <span className="wall-stat">{boothPhotos.length} booth photos</span>
          {boothVideos.length > 0 && (
            <>
              <span className="wall-stat-dot">·</span>
              <span className="wall-stat">{boothVideos.length} videos</span>
            </>
          )}
          {notesWithPhotos > 0 && (
            <>
              <span className="wall-stat-dot">·</span>
              <span className="wall-stat">{notesWithPhotos} with photos</span>
            </>
          )}
        </div>
      </div>

      {/* Main masonry grid */}
      {allEntries.length === 0 ? (
        <div className="wall-empty">
          <div className="wall-empty-icon">📖</div>
          <h3>The guestbook is waiting for its first message!</h3>
          <p>Click the button below to be the first to congratulate Jeannette.</p>
        </div>
      ) : (
        <div className="wall-masonry">
          {visibleEntries.map((entry, i) => {
            if (entry._type === 'message') {
              return (
                <div key={`m-${entry.id}`} className="wall-masonry-item" onClick={() => handleEntryClick(entry)}>
                  <NoteCard message={entry} index={i} />
                </div>
              )
            }
            if (entry._type === 'photo') {
              return (
                <div key={`p-${entry.id}`} className="wall-masonry-item">
                  <BoothPhotoCard photo={entry} index={i} onClick={() => handleEntryClick(entry)} />
                </div>
              )
            }
            return (
              <div key={`v-${entry.id}`} className="wall-masonry-item">
                <VideoEntryCard video={entry} index={i} onClick={() => handleEntryClick(entry)} autoPlay />
              </div>
            )
          })}
          {visibleCount < allEntries.length && (
            <div ref={loadMoreRef} className="wall-load-more">
              <div className="wall-load-spinner" />
              <span>Loading more...</span>
            </div>
          )}
        </div>
      )}

      {/* Floating action buttons */}
      <div className="wall-fab-group">
        <button className="wall-fab wall-fab-booth" onClick={() => navigate('/booth')} aria-label="Open Photo Booth">
          <span className="wall-fab-icon">📸</span>
          <span>Photo Booth</span>
        </button>
        <button className="wall-fab wall-fab-message" onClick={() => setShowModal(true)} aria-label="Add a message">
          <span className="wall-fab-icon">✍</span>
          <span>Add Message</span>
        </button>
      </div>

      {/* Modals */}
      {showModal && (
        <AddMessageModal
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
        />
      )}

      {selectedEntry && (
        <EntryModal
          entry={selectedEntry}
          type={selectedEntry._type}
          onClose={() => setSelectedEntry(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
