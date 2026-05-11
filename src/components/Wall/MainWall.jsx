import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMessages, useBoothPhotos, useBoothVideos, useReactions } from '../../hooks/useDatabase'
import useBroadcastChannel from '../../hooks/useBroadcastChannel'
import { isSupabaseConfigured } from '../../data/supabaseClient'
import { buildReactionHighlights, buildReactionLeaderboard } from '../../utils/reactionUtils'
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
  const { reactions } = useReactions()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const { broadcast } = useBroadcastChannel()
  const loadMoreRef = useRef(null)
  const canDeleteEntries = !isSupabaseConfigured

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
  const reactionHighlights = useMemo(() => buildReactionHighlights({
    messages,
    boothPhotos,
    boothVideos,
    reactions,
  }), [boothPhotos, boothVideos, messages, reactions])
  const reactionLeaderboard = useMemo(() => buildReactionLeaderboard({
    messages,
    boothPhotos,
    boothVideos,
    reactions,
  }, 5), [boothPhotos, boothVideos, messages, reactions])

  const renderReactionTrail = (sortedBreakdown) => sortedBreakdown.slice(0, 3).map(([emoji, count]) => (
    <span key={`${emoji}-${count}`} className="wall-highlight-reaction-pill">{emoji} {count}</span>
  ))

  const openHighlightedEntry = (item) => {
    setSelectedEntry({ ...item.entry, _type: item.type })
  }

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

      {reactionHighlights.length > 0 && (
        <section className="wall-highlights">
          <div className="wall-highlights-header">
            <div>
              <p className="wall-highlights-eyebrow">Crowd favorites</p>
              <h3>Most loved moments</h3>
            </div>
            <div className="wall-highlights-summary">
              <span>{reactionLeaderboard.length} ranked highlights</span>
            </div>
          </div>

          <div className="wall-highlights-layout">
            <div className="wall-leaderboard">
              {reactionLeaderboard.map((item, index) => (
                <button
                  key={`${item.type}-${item.entry.id}`}
                  type="button"
                  className="wall-leaderboard-item"
                  onClick={() => openHighlightedEntry(item)}
                >
                  <span className="wall-leaderboard-rank">#{index + 1}</span>
                  <span className="wall-leaderboard-copy">
                    <strong>{item.type === 'message' ? (item.entry.name || 'Anonymous') : item.type === 'photo' ? 'Photo Booth' : 'Video Moment'}</strong>
                    <span>{item.total} reactions</span>
                  </span>
                  <span className="wall-leaderboard-reactions">
                    {renderReactionTrail(item.sortedBreakdown)}
                  </span>
                </button>
              ))}
            </div>

            <div className="wall-highlight-cards">
              {reactionHighlights.map((item, index) => (
                <div key={`${item.type}-${item.entry.id}`} className="wall-highlight-card">
                  <div className="wall-highlight-card-header">
                    <span className="wall-highlight-type">
                      {item.type === 'message' ? 'Top message' : item.type === 'photo' ? 'Top photo' : 'Top video'}
                    </span>
                    <span className="wall-highlight-total">{item.total} reactions</span>
                  </div>
                  <div className="wall-highlight-card-body">
                    {item.type === 'message' ? (
                      <button type="button" className="wall-highlight-frame" onClick={() => openHighlightedEntry(item)}>
                        <NoteCard message={item.entry} index={index} large />
                      </button>
                    ) : item.type === 'photo' ? (
                      <BoothPhotoCard photo={item.entry} index={index} large onClick={() => openHighlightedEntry(item)} />
                    ) : (
                      <VideoEntryCard video={item.entry} index={index} large autoPlay onClick={() => openHighlightedEntry(item)} />
                    )}
                  </div>
                  <div className="wall-highlight-reactions">
                    {renderReactionTrail(item.sortedBreakdown)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
                  <BoothPhotoCard
                    photo={entry}
                    index={i}
                    onClick={() => handleEntryClick(entry)}
                    onDelete={canDeleteEntries ? (id) => handleDelete('photo', id) : undefined}
                  />
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
          onDelete={canDeleteEntries ? handleDelete : undefined}
        />
      )}
    </div>
  )
}
