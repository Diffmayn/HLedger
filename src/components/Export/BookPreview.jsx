import { useEffect, useMemo, useState } from 'react'
import './BookPreview.css'

function chunkItems(items, size) {
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function renderPage(page) {
  switch (page.type) {
    case 'cover':
      return (
        <div className="book-page book-cover">
          <span className="book-page-chip">Cover</span>
          <div className="book-cover-star">✦</div>
          <h2>Celebrating</h2>
          <h1>Jeannette</h1>
          <div className="book-cover-divider" />
          <p className="book-cover-years">25 Wonderful Years</p>
          <p className="book-cover-company">at Salling Group</p>
        </div>
      )

    case 'speech':
      return (
        <div className="book-page book-speech">
          <span className="book-page-chip">Speech</span>
          <h3>{page.title || 'A Few Words'}</h3>
          <div className="book-speech-text">
            {page.body.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          {page.author && <p className="book-speech-author">— {page.author}</p>}
        </div>
      )

    case 'messages':
      return (
        <div className="book-page book-messages">
          <span className="book-page-chip">Messages</span>
          <h3>{page.title}</h3>
          <div className="book-messages-grid">
            {page.items.map((msg) => (
              <div key={msg.id} className="book-message-item">
                <p className="book-message-text">{msg.message}</p>
                {msg.emojis && <span className="book-message-emojis">{msg.emojis}</span>}
                <p className="book-message-name">— {msg.name || 'Anonymous'}</p>
              </div>
            ))}
          </div>
          {page.remaining > 0 && (
            <p className="book-messages-more">{page.remaining} more messages continue on the next pages.</p>
          )}
        </div>
      )

    case 'photos':
      return (
        <div className="book-page book-photos">
          <span className="book-page-chip">Gallery</span>
          <h3>{page.title}</h3>
          <div className={`book-photos-grid ${page.items.some((photo) => photo.isStrip) ? 'book-photos-grid--mixed' : ''}`}>
            {page.items.map((photo) => (
              <div key={photo.id} className={`book-photo-item${photo.isStrip ? ' book-photo-item--strip' : ''}`}>
                <img src={photo.photoDataUrl} alt={photo.isStrip ? 'Photo strip memory' : 'Booth memory'} />
                <span className="book-photo-kind">{photo.isStrip ? 'Photo strip' : 'Booth photo'}</span>
              </div>
            ))}
          </div>
          {page.remaining > 0 && (
            <p className="book-messages-more">{page.remaining} more photos continue on the next pages.</p>
          )}
        </div>
      )

    case 'videos':
      return (
        <div className="book-page book-videos">
          <span className="book-page-chip">Videos</span>
          <h3>{page.title}</h3>
          <div className="book-videos-grid">
            {page.items.map((video) => (
              <div key={video.id} className="book-video-item">
                {video.videoThumbnailDataUrl ? (
                  <img src={video.videoThumbnailDataUrl} alt={video.title || 'Saved video preview'} />
                ) : (
                  <div className="book-video-thumb-placeholder">No preview</div>
                )}
                <span className="book-photo-kind">{video.source === 'booth' ? 'Booth video' : 'Video message'}</span>
              </div>
            ))}
          </div>
          {page.remaining > 0 && (
            <p className="book-messages-more">{page.remaining} more videos continue on the next pages.</p>
          )}
        </div>
      )

    case 'notes':
      return (
        <div className="book-page book-notes">
          <span className="book-page-chip">Notes</span>
          <h3>Personal Notes</h3>
          <div className="book-notes-body">
            {page.body.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph || ' '}</p>
            ))}
          </div>
        </div>
      )

    case 'back':
    default:
      return (
        <div className="book-page book-back">
          <span className="book-page-chip">Back Cover</span>
          <p>Thank you for being part of</p>
          <p className="book-back-name">Jeannette's Journey</p>
          <p className="book-back-date">{new Date().toLocaleDateString('da-DK', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      )
  }
}

export default function BookPreview({ messages, boothPhotos, boothVideos, speech, sections, notes }) {
  const pages = useMemo(() => {
    const nextPages = []

    if (sections?.cover !== false) {
      nextPages.push({ type: 'cover', label: 'Cover' })
    }

    if (sections?.speech !== false && speech?.body) {
      nextPages.push({
        type: 'speech',
        label: 'Speech',
        title: speech.title,
        body: speech.body,
        author: speech.author
      })
    }

    if (sections?.messages !== false && messages.length > 0) {
      const chunks = chunkItems(messages, 4)
      chunks.forEach((items, index) => {
        nextPages.push({
          type: 'messages',
          label: `Messages ${index + 1}`,
          title: index === 0 ? 'Messages from Colleagues' : 'More Kind Words',
          items,
          remaining: Math.max(messages.length - (index + 1) * 4, 0)
        })
      })
    }

    if (sections?.photos !== false && boothPhotos.length > 0) {
      const chunks = chunkItems(boothPhotos, 4)
      chunks.forEach((items, index) => {
        nextPages.push({
          type: 'photos',
          label: `Photos ${index + 1}`,
          title: index === 0 ? 'Photo Booth Memories' : 'More Photo Booth Moments',
          items,
          remaining: Math.max(boothPhotos.length - (index + 1) * 4, 0)
        })
      })
    }

    if (sections?.videos !== false && boothVideos.length > 0) {
      const chunks = chunkItems(boothVideos, 4)
      chunks.forEach((items, index) => {
        nextPages.push({
          type: 'videos',
          label: `Videos ${index + 1}`,
          title: index === 0 ? 'Video Messages & Booth Clips' : 'More Saved Videos',
          items,
          remaining: Math.max(boothVideos.length - (index + 1) * 4, 0)
        })
      })
    }

    if (sections?.notes !== false && notes?.trim()) {
      nextPages.push({ type: 'notes', label: 'Notes', body: notes.trim() })
    }

    if (sections?.backCover !== false) {
      nextPages.push({ type: 'back', label: 'Back Cover' })
    }

    return nextPages
  }, [boothPhotos, boothVideos, messages, notes, sections, speech])

  const [currentPage, setCurrentPage] = useState(0)
  const [flipDirection, setFlipDirection] = useState('next')

  const goToPage = (index) => {
    if (index < 0 || index >= pages.length || index === currentPage) return
    setFlipDirection(index > currentPage ? 'next' : 'prev')
    setCurrentPage(index)
  }

  const handleStageClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const clickedLeftSide = event.clientX < rect.left + rect.width / 2
    goToPage(clickedLeftSide ? currentPage - 1 : currentPage + 1)
  }

  useEffect(() => {
    if (currentPage > pages.length - 1) {
      setCurrentPage(Math.max(0, pages.length - 1))
    }
  }, [currentPage, pages.length])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName
      const isTypingField = tagName === 'INPUT' || tagName === 'TEXTAREA' || event.target?.isContentEditable

      if (isTypingField) return
      if (event.key === 'ArrowRight') goToPage(currentPage + 1)
      if (event.key === 'ArrowLeft') goToPage(currentPage - 1)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, pages.length])

  if (pages.length === 0) {
    return (
      <div className="book-preview-shell">
        <p className="book-preview-empty">No pages are available for preview yet.</p>
      </div>
    )
  }

  const activePage = pages[currentPage]

  return (
    <div className="book-preview-shell">
      <div className="book-preview-toolbar">
        <button
          type="button"
          className="book-preview-nav"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 0}
          aria-label="Go to previous page"
        >
          ←
        </button>

        <div className="book-preview-status">
          <strong>Page {currentPage + 1} of {pages.length}</strong>
          <span>{activePage.label}</span>
        </div>

        <button
          type="button"
          className="book-preview-nav"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === pages.length - 1}
          aria-label="Go to next page"
        >
          →
        </button>
      </div>

      <p className="book-preview-hint">Click the left or right side of the page to turn it like a book.</p>

      <div className="book-stage" onClick={handleStageClick} role="presentation">
        <div key={currentPage} className={`book-preview book-preview-flip-${flipDirection}`}>
          {renderPage(activePage)}
        </div>
      </div>

      <div className="book-preview-dots" aria-label="Book pages">
        {pages.map((page, index) => (
          <button
            key={`${page.label}-${index}`}
            type="button"
            className={`book-preview-dot ${index === currentPage ? 'is-active' : ''}`}
            onClick={() => goToPage(index)}
            aria-label={`Go to ${page.label}`}
          />
        ))}
      </div>
    </div>
  )
}
