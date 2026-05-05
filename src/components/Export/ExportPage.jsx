import { useMemo, useState } from 'react'
import { useMessages, useBoothPhotos, useBoothVideos, useSettings, useSpeech } from '../../hooks/useDatabase'
import { estimateGuestbookPages, generateGuestbookPDF } from '../../utils/pdfExport'
import SpeechEditor from './SpeechEditor'
import NotesEditor from './NotesEditor'
import BookPreview from './BookPreview'
import { formatVideoDuration } from '../../utils/videoUtils'
import './ExportPage.css'

function dataUrlToBlob(dataUrl) {
  if (!dataUrl || !dataUrl.includes(',')) {
    throw new Error('Invalid image data supplied for export')
  }

  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

function escapeCsv(val) {
  if (val == null) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export default function ExportPage() {
  const { messages } = useMessages()
  const { photos: boothPhotos } = useBoothPhotos()
  const { videos: boothVideos } = useBoothVideos()
  const { speech } = useSpeech()
  const { getSetting } = useSettings()
  const notes = getSetting('ebookNotes') || ''

  const [isGenerating, setIsGenerating] = useState(false)
  const [isZipping, setIsZipping] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [sections, setSections] = useState({
    cover: true,
    speech: true,
    messages: true,
    photos: true,
    videos: false,
    notes: true,
    backCover: true
  })

  const toggleSection = (key) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const estimatedPages = useMemo(() => estimateGuestbookPages({
    messages,
    boothPhotos,
    boothVideos,
    speech,
    notes,
    includeSections: sections
  }), [messages, boothPhotos, boothVideos, notes, sections, speech])

  const hasSelectedSection = Object.values(sections).some(Boolean)

  const handleExport = async () => {
    setStatusMessage('')
    setIsGenerating(true)
    try {
      await generateGuestbookPDF({
        messages,
        boothPhotos,
        boothVideos,
        speech,
        notes,
        includeSections: sections
      })
      setStatusMessage('Your PDF book is ready to download.')
    } catch (err) {
      console.error('PDF generation failed:', err)
      setStatusMessage('The PDF could not be created. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleZipExport = async () => {
    setStatusMessage('')
    setIsZipping(true)
    try {
      const [{ default: JSZip }, { saveAs }] = await Promise.all([
        import('jszip'),
        import('file-saver')
      ])
      const zip = new JSZip()

      const messagesData = messages.map(({ id, name, message, emojis, timestamp, photoDataUrl, videoBlob, videoDuration }) => ({
        id, name, message, emojis, timestamp,
        hasPhoto: !!photoDataUrl,
        hasVideo: !!videoBlob,
        videoDuration: videoBlob ? formatVideoDuration(videoDuration) : '',
        date: new Date(timestamp).toISOString()
      }))
      zip.file('messages.json', JSON.stringify(messagesData, null, 2))

      const photosFolder = zip.folder('photos')
      messages.forEach((m, i) => {
        if (m.photoDataUrl) {
          const blob = dataUrlToBlob(m.photoDataUrl)
          const ext = m.photoDataUrl.includes('image/png') ? 'png' : 'jpg'
          photosFolder?.file(`message-${i + 1}-${m.name || 'anon'}.${ext}`, blob)
        }
      })

      const messageVideosFolder = zip.folder('message-videos')
      messages.forEach((message, index) => {
        if (message.videoBlob) {
          const extension = message.videoMimeType?.includes('mp4') ? 'mp4' : 'webm'
          messageVideosFolder?.file(`message-video-${index + 1}-${message.name || 'anon'}.${extension}`, message.videoBlob)
        }
      })

      const boothFolder = zip.folder('booth-photos')
      boothPhotos.forEach((p, i) => {
        if (p.photoDataUrl) {
          const blob = dataUrlToBlob(p.photoDataUrl)
          boothFolder?.file(`booth-${i + 1}.jpg`, blob)
        }
      })

      const boothVideosFolder = zip.folder('booth-videos')
      boothVideos.forEach((video, index) => {
        if (video.videoBlob) {
          const extension = video.videoMimeType?.includes('mp4') ? 'mp4' : 'webm'
          boothVideosFolder?.file(`booth-video-${index + 1}.${extension}`, video.videoBlob)
        }
      })

      if (messages.some(message => message.videoBlob) || boothVideos.length > 0) {
        zip.file('video-metadata.json', JSON.stringify({
          messageVideos: messages
            .filter(message => message.videoBlob)
            .map(message => ({
              id: message.id,
              name: message.name,
              duration: formatVideoDuration(message.videoDuration),
              timestamp: message.timestamp
            })),
          boothVideos: boothVideos.map(video => ({
            id: video.id,
            duration: formatVideoDuration(video.videoDuration),
            timestamp: video.timestamp,
            source: video.source
          }))
        }, null, 2))
      }

      if (speech?.body) {
        zip.file('speech.txt', `${speech.title || 'Speech'}\n\n${speech.body}`)
      }

      if (notes.trim()) {
        zip.file('notes.txt', notes.trim())
      }

      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, 'jeannettes-guestbook.zip')
      setStatusMessage('The ZIP archive has been prepared.')
    } catch (err) {
      console.error('ZIP export failed:', err)
      setStatusMessage('The ZIP archive could not be created. Please try again.')
    } finally {
      setIsZipping(false)
    }
  }

  const handleCsvExport = () => {
    const header = ['Name', 'Message', 'Emojis', 'Has Photo', 'Has Video', 'Video Duration', 'Date']
    const rows = messages.map(m => [
      escapeCsv(m.name),
      escapeCsv(m.message),
      escapeCsv(m.emojis),
      m.photoDataUrl ? 'Yes' : 'No',
      m.videoBlob ? 'Yes' : 'No',
      m.videoBlob ? formatVideoDuration(m.videoDuration) : '',
      new Date(m.timestamp).toISOString()
    ].join(','))

    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jeannettes-guestbook.csv'
    a.click()
    URL.revokeObjectURL(url)
    setStatusMessage('The CSV export is ready to download.')
  }

  return (
    <div className="export-page">
      <div className="export-header">
        <h2>📖 Create Guestbook</h2>
        <p>Preview the ebook like a small book, then export it with your own final notes.</p>
      </div>

      <div className="export-layout">
        <div className="export-main">
          <div className="export-section">
            <h3>Book Preview</h3>
            <BookPreview
              messages={messages}
              boothPhotos={boothPhotos}
              boothVideos={boothVideos}
              speech={speech}
              sections={sections}
              notes={notes}
            />
          </div>

          <div className="export-editors">
            <div className="export-section">
              <SpeechEditor />
            </div>
            <div className="export-section">
              <NotesEditor />
            </div>
          </div>
        </div>

        <div className="export-sidebar">
          <div className="export-stats">
            <h3>Book Contents</h3>
            <div className="export-stat">
              <span className="export-stat-label">Messages</span>
              <span className="export-stat-value">{messages.length}</span>
            </div>
            <div className="export-stat">
              <span className="export-stat-label">Photos</span>
              <span className="export-stat-value">{boothPhotos.length}</span>
            </div>
            <div className="export-stat">
              <span className="export-stat-label">Videos</span>
              <span className="export-stat-value">{messages.filter(message => message.videoBlob).length + boothVideos.length}</span>
            </div>
            <div className="export-stat">
              <span className="export-stat-label">Speech</span>
              <span className="export-stat-value">{speech?.body ? '✓' : '—'}</span>
            </div>
            <div className="export-stat">
              <span className="export-stat-label">Notes page</span>
              <span className="export-stat-value">{notes.trim() ? '✓' : '—'}</span>
            </div>
            <div className="export-stat">
              <span className="export-stat-label">Estimated pages</span>
              <span className="export-stat-value">{estimatedPages}</span>
            </div>
          </div>

          <div className="export-options">
            <h3>📖 Book Sections</h3>
            {[
              { key: 'cover',     icon: '🎨', label: 'Cover Page',        count: null },
              { key: 'speech',    icon: '🎤', label: "Boss's Speech",     count: speech?.body ? '✓' : null },
              { key: 'messages',  icon: '💬', label: 'Guest Messages',    count: messages.length || null },
              { key: 'photos',    icon: '📸', label: 'Booth Photos',      count: boothPhotos.length || null },
              { key: 'videos',    icon: '🎥', label: 'Videos',            count: (messages.filter(m => m.videoBlob).length + boothVideos.length) || null, optin: true },
              { key: 'notes',     icon: '📝', label: 'Personal Notes',    count: notes.trim() ? '✓' : null },
              { key: 'backCover', icon: '🌟', label: 'Back Cover',        count: null }
            ].map(({ key, icon, label, count, optin }) => (
              <label key={key} className="export-checkbox">
                <input
                  type="checkbox"
                  checked={sections[key]}
                  onChange={() => toggleSection(key)}
                />
                <span className="export-checkbox-icon">{icon}</span>
                <span className="export-checkbox-label">
                  {label}
                  {optin && <span className="export-optin-badge">opt-in</span>}
                </span>
                {count !== null && <span className="export-checkbox-count">{count}</span>}
              </label>
            ))}
          </div>

          <button
            className="export-btn export-btn-print"
            onClick={() => window.print()}
          >
            🖨️ Print Current Page
          </button>

          <div className="export-pdf-wrap">
            <button
              className="export-btn"
              onClick={handleExport}
              disabled={isGenerating || !hasSelectedSection}
            >
              {isGenerating ? (
                <span className="export-btn-loading">⏳ Generating PDF…</span>
              ) : (
                <span>📖 Download PDF Book</span>
              )}
            </button>
            <p className="export-page-estimate">~{estimatedPages} {estimatedPages === 1 ? 'page' : 'pages'}</p>
          </div>

          <button
            className="export-btn export-btn-zip"
            onClick={handleZipExport}
            disabled={isZipping || (messages.length === 0 && boothPhotos.length === 0 && boothVideos.length === 0 && !speech?.body && !notes.trim())}
          >
            {isZipping ? (
              <span className="export-btn-loading">⏳ Creating ZIP…</span>
            ) : (
              <span>📦 Download ZIP Archive</span>
            )}
          </button>

          <button
            className="export-btn export-btn-csv"
            onClick={handleCsvExport}
            disabled={messages.length === 0}
          >
            <span>📊 Export CSV Spreadsheet</span>
          </button>

          {statusMessage && (
            <p className="export-status">{statusMessage}</p>
          )}

          {!hasSelectedSection && (
            <p className="export-hint">Turn on at least one section to create the book.</p>
          )}
        </div>
      </div>
    </div>
  )
}
