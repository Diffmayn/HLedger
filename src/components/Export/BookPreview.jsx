import { useEffect, useMemo, useRef, useState } from 'react'
import './BookPreview.css'

function chunkItems(items, size) {
  const chunks = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

// ─── Page Components ───────────────────────────────────────────────────────────

function PageCover() {
  return (
    <div className="bp-page bp-cover">
      <div className="bp-cover-ornament">✦</div>
      <div className="bp-cover-body">
        <p className="bp-cover-celebrating">Celebrating</p>
        <h1 className="bp-cover-name">Jeannette</h1>
        <div className="bp-cover-rule" />
        <p className="bp-cover-years">25 Wonderful Years</p>
        <p className="bp-cover-company">at Salling Group</p>
      </div>
      <p className="bp-cover-date">
        {new Date().toLocaleDateString('da-DK', { year: 'numeric', month: 'long' })}
      </p>
    </div>
  )
}

function PageSpeech({ page }) {
  return (
    <div className="bp-page bp-interior">
      <header className="bp-page-header">
        <span className="bp-chip">Speech</span>
        <h3>{page.title || 'A Few Words'}</h3>
        <div className="bp-rule" />
      </header>
      <div className="bp-speech-body">
        {page.body.split('\n').map((p, i) => <p key={i}>{p || '\u00a0'}</p>)}
      </div>
      {page.author && <p className="bp-speech-author">— {page.author}</p>}
      <div className="bp-page-number">{page.pageNum}</div>
    </div>
  )
}

function PageMessages({ page }) {
  return (
    <div className="bp-page bp-interior">
      <header className="bp-page-header">
        <span className="bp-chip">Messages</span>
        <h3>{page.title}</h3>
        <div className="bp-rule" />
      </header>
      <div className="bp-messages-list">
        {page.items.map((msg) => (
          <div key={msg.id} className="bp-message-card">
            {msg.photoDataUrl && (
              <div className="bp-msg-photo">
                <div className="bp-photo-mat"><img src={msg.photoDataUrl} alt="" /></div>
              </div>
            )}
            <p className="bp-message-text">{msg.message}</p>
            {msg.emojis && <span className="bp-message-emojis">{msg.emojis}</span>}
            <p className="bp-message-name">— {msg.name || 'Anonymous'}</p>
          </div>
        ))}
      </div>
      {page.remaining > 0 && <p className="bp-continues">+{page.remaining} more on next pages</p>}
      <div className="bp-page-number">{page.pageNum}</div>
    </div>
  )
}

function PagePhotos({ page }) {
  const hasStrip = page.items.some(p => p.isStrip)
  return (
    <div className="bp-page bp-interior">
      <header className="bp-page-header">
        <span className="bp-chip">Gallery</span>
        <h3>{page.title}</h3>
        <div className="bp-rule" />
      </header>
      <div className={`bp-photo-grid ${hasStrip ? 'bp-photo-grid--single' : ''}`}>
        {page.items.map((photo) => (
          <div key={photo.id} className={`bp-photo-frame ${photo.isStrip ? 'bp-photo-frame--strip' : ''}`}>
            <div className="bp-photo-mat">
              <img src={photo.photoDataUrl} alt={photo.isStrip ? 'Photo strip' : 'Booth photo'} />
            </div>
            <p className="bp-photo-caption">{photo.isStrip ? '🎞 Photo Strip' : '📸 Booth'}</p>
          </div>
        ))}
      </div>
      {page.remaining > 0 && <p className="bp-continues">+{page.remaining} more photos on next pages</p>}
      <div className="bp-page-number">{page.pageNum}</div>
    </div>
  )
}

function PageVideos({ page }) {
  return (
    <div className="bp-page bp-interior">
      <header className="bp-page-header">
        <span className="bp-chip">Videos</span>
        <h3>{page.title}</h3>
        <div className="bp-rule" />
      </header>
      <div className="bp-photo-grid">
        {page.items.map((video) => (
          <div key={video.id} className="bp-photo-frame bp-video-frame">
            <div className="bp-photo-mat bp-video-mat">
              {video.videoThumbnailDataUrl
                ? <img src={video.videoThumbnailDataUrl} alt="Video" />
                : <div className="bp-video-placeholder">🎥</div>}
              <div className="bp-play-badge">▶</div>
            </div>
            <p className="bp-photo-caption">{video.source === 'booth' ? 'Booth clip' : 'Video message'}</p>
          </div>
        ))}
      </div>
      {page.remaining > 0 && <p className="bp-continues">+{page.remaining} more on next pages</p>}
      <div className="bp-page-number">{page.pageNum}</div>
    </div>
  )
}

function PageNotes({ page }) {
  return (
    <div className="bp-page bp-interior">
      <header className="bp-page-header">
        <span className="bp-chip">Notes</span>
        <h3>Personal Notes</h3>
        <div className="bp-rule" />
      </header>
      <div className="bp-notes-lined">
        {page.body.split('\n').map((line, i) => (
          <p key={i} className="bp-notes-line">{line || '\u00a0'}</p>
        ))}
      </div>
      <div className="bp-page-number">{page.pageNum}</div>
    </div>
  )
}

function PageBack() {
  return (
    <div className="bp-page bp-back">
      <div className="bp-cover-ornament">✦</div>
      <p className="bp-back-thanks">Thank you for being part of</p>
      <p className="bp-back-name">Jeannette's Journey</p>
      <div className="bp-cover-rule" />
      <p className="bp-back-date">
        {new Date().toLocaleDateString('da-DK', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  )
}

function renderPage(page) {
  switch (page.type) {
    case 'cover':    return <PageCover />
    case 'speech':   return <PageSpeech page={page} />
    case 'messages': return <PageMessages page={page} />
    case 'photos':   return <PagePhotos page={page} />
    case 'videos':   return <PageVideos page={page} />
    case 'notes':    return <PageNotes page={page} />
    case 'back':
    default:         return <PageBack />
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function BookPreview({ messages, boothPhotos, boothVideos, speech, sections, notes }) {
  const pages = useMemo(() => {
    const out = []
    let pageNum = 1

    if (sections?.cover !== false)
      out.push({ type: 'cover', label: 'Cover', pageNum: pageNum++ })

    if (sections?.speech !== false && speech?.body)
      out.push({ type: 'speech', label: 'Speech', pageNum: pageNum++, title: speech.title, body: speech.body, author: speech.author })

    if (sections?.messages !== false && messages.length > 0) {
      chunkItems(messages, 3).forEach((items, i) => out.push({
        type: 'messages', label: `Messages ${i + 1}`, pageNum: pageNum++,
        title: i === 0 ? 'Messages from Colleagues' : 'More Kind Words',
        items, remaining: Math.max(messages.length - (i + 1) * 3, 0)
      }))
    }

    if (sections?.photos !== false && boothPhotos.length > 0) {
      chunkItems(boothPhotos, 4).forEach((items, i) => out.push({
        type: 'photos', label: `Photos ${i + 1}`, pageNum: pageNum++,
        title: i === 0 ? 'Photo Booth Memories' : 'More Booth Moments',
        items, remaining: Math.max(boothPhotos.length - (i + 1) * 4, 0)
      }))
    }

    if (sections?.videos !== false && boothVideos.length > 0) {
      chunkItems(boothVideos, 4).forEach((items, i) => out.push({
        type: 'videos', label: `Videos ${i + 1}`, pageNum: pageNum++,
        title: i === 0 ? 'Video Memories' : 'More Videos',
        items, remaining: Math.max(boothVideos.length - (i + 1) * 4, 0)
      }))
    }

    if (sections?.notes !== false && notes?.trim())
      out.push({ type: 'notes', label: 'Notes', pageNum: pageNum++, body: notes.trim() })

    if (sections?.backCover !== false)
      out.push({ type: 'back', label: 'Back Cover', pageNum: pageNum++ })

    return out
  }, [boothPhotos, boothVideos, messages, notes, sections, speech])

  const [current, setCurrent] = useState(0)
  const [displayed, setDisplayed] = useState(0)
  const [animState, setAnimState] = useState('')
  const [spread, setSpread] = useState(false)
  const busy = useRef(false)

  const goToPage = (idx) => {
    if (idx < 0 || idx >= pages.length || idx === current || busy.current) return
    const dir = idx > current ? 'next' : 'prev'
    busy.current = true
    setAnimState(`out-${dir}`)
    setTimeout(() => {
      setDisplayed(idx)
      setCurrent(idx)
      setAnimState(`in-${dir}`)
      setTimeout(() => {
        setAnimState('')
        busy.current = false
      }, 380)
    }, 220)
  }

  useEffect(() => {
    if (current >= pages.length) {
      const safe = Math.max(0, pages.length - 1)
      setCurrent(safe)
      setDisplayed(safe)
    }
  }, [pages.length])

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      if (e.key === 'ArrowRight') goToPage(current + 1)
      if (e.key === 'ArrowLeft')  goToPage(current - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, pages.length])

  if (pages.length === 0) {
    return (
      <div className="bp-shell">
        <p className="bp-empty">Enable at least one section to preview the book.</p>
      </div>
    )
  }

  const activePage = pages[displayed] ?? pages[0]
  const spreadLeft = spread && current > 0 ? pages[current - 1] : null

  return (
    <div className="bp-shell">

      {/* Toolbar */}
      <div className="bp-toolbar">
        <button className="bp-nav" onClick={() => goToPage(current - 1)} disabled={current === 0} aria-label="Previous page">‹</button>
        <div className="bp-toolbar-center">
          <span className="bp-page-label">{activePage.label}</span>
          <span className="bp-page-count">Page {current + 1} of {pages.length}</span>
        </div>
        <button className="bp-nav" onClick={() => goToPage(current + 1)} disabled={current === pages.length - 1} aria-label="Next page">›</button>
        <button
          className={`bp-spread-btn ${spread ? 'bp-spread-btn--on' : ''}`}
          onClick={() => setSpread(s => !s)}
          title={spread ? 'Single page view' : 'Two-page spread'}
        >
          {spread ? '▭' : '▯▯'}
        </button>
      </div>

      {/* Book Stage */}
      {spread ? (
        <div className="bp-stage bp-stage--spread">
          <div className="bp-spread-wrapper">
            {spreadLeft
              ? <div className="bp-page-wrapper bp-spread-left">{renderPage(spreadLeft)}</div>
              : <div className="bp-spread-blank" />}
            <div className="bp-spine" />
            <div className="bp-page-wrapper bp-spread-right">{renderPage(activePage)}</div>
          </div>
        </div>
      ) : (
        <div
          className="bp-stage"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            goToPage(e.clientX < r.left + r.width / 2 ? current - 1 : current + 1)
          }}
        >
          <div className={`bp-edge bp-edge-left ${current === 0 ? 'bp-edge--dim' : ''}`} />
          <div className={`bp-page-wrapper bp-anim-${animState}`}>
            {renderPage(activePage)}
          </div>
          <div className={`bp-edge bp-edge-right ${current === pages.length - 1 ? 'bp-edge--dim' : ''}`} />
        </div>
      )}

      <p className="bp-hint">
        {spread
          ? 'Two-page spread — click ▭ for single page'
          : '‹ › or click edges to turn pages · ▯▯ for spread view'}
      </p>

      {/* Dot navigation */}
      <div className="bp-dots">
        {pages.map((p, i) => (
          <button
            key={`${p.type}-${i}`}
            className={`bp-dot ${i === current ? 'bp-dot--active' : ''}`}
            onClick={() => goToPage(i)}
            aria-label={`Page ${i + 1}: ${p.label}`}
            title={p.label}
          />
        ))}
      </div>

    </div>
  )
}
