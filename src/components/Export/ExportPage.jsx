import { Component, useMemo, useState } from 'react'
import { useMessages, useBoothPhotos, useBoothVideos, useReactions, useSettings, useSpeech } from '../../hooks/useDatabase'
import { estimateGuestbookPages, generateGuestbookPDF } from '../../utils/pdfExport'
import { buildReactionLeaderboard } from '../../utils/reactionUtils'
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

function sanitizeFilePart(value, fallback = 'entry') {
  const cleaned = String(value || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return cleaned || fallback
}

function extensionFromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return 'jpg'
  if (dataUrl.includes('image/png')) return 'png'
  if (dataUrl.includes('image/webp')) return 'webp'
  if (dataUrl.includes('image/gif')) return 'gif'
  return 'jpg'
}

async function writeFileToDirectory(directoryHandle, filename, content) {
  const fileHandle = await directoryHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

function buildMessageExportText(message) {
  return [
    `Name: ${message.name || 'Anonymous'}`,
    `Date: ${new Date(message.timestamp || Date.now()).toISOString()}`,
    message.emojis ? `Emojis: ${message.emojis}` : null,
    '',
    message.message || ''
  ].filter(Boolean).join('\n')
}

class ExportPreviewErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Export preview failed to render:', error)
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="export-preview-error">
          <p>Preview temporarily unavailable.</p>
          <p>You can still export PDF/ZIP/files from the right panel.</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ExportPage() {
  const { messages } = useMessages()
  const { photos: boothPhotos } = useBoothPhotos()
  const { videos: boothVideos } = useBoothVideos()
  const { reactions } = useReactions()
  const { speech, saveSpeech } = useSpeech()
  const { getSetting, setSetting } = useSettings()
  const notes = getSetting('ebookNotes') || ''

  const [isGenerating, setIsGenerating] = useState(false)
  const [isZipping, setIsZipping] = useState(false)
  const [isGeneratingHighlights, setIsGeneratingHighlights] = useState(false)
  const [isSavingFolder, setIsSavingFolder] = useState(false)
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
  const hasAnyContent = messages.length > 0 || boothPhotos.length > 0 || boothVideos.length > 0 || !!speech?.body || !!notes.trim()
  const messageVideos = useMemo(() => messages.filter((message) => message.videoBlob), [messages])
  const boothStrips = useMemo(() => boothPhotos.filter((photo) => photo.isStrip), [boothPhotos])
  const reactionHighlights = useMemo(() => buildReactionLeaderboard({
    messages,
    boothPhotos,
    boothVideos,
    reactions,
  }, 10), [boothPhotos, boothVideos, messages, reactions])
  const hasHighlightBundle = boothStrips.length > 0 || boothVideos.length > 0 || reactionHighlights.length > 0

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

  const handleHighlightsExport = async () => {
    setStatusMessage('')
    setIsGeneratingHighlights(true)

    try {
      const [{ default: JSZip }, { saveAs }] = await Promise.all([
        import('jszip'),
        import('file-saver')
      ])

      const zip = new JSZip()
      const highlightsFolder = zip.folder('highlights')
      const stripsFolder = highlightsFolder?.folder('booth-strips')
      const videosFolder = highlightsFolder?.folder('booth-videos')
      const topReactedFolder = highlightsFolder?.folder('top-reacted')

      boothStrips.forEach((photo, index) => {
        if (!photo.photoDataUrl) return
        const extension = extensionFromDataUrl(photo.photoDataUrl)
        stripsFolder?.file(`strip-${String(index + 1).padStart(2, '0')}.${extension}`, dataUrlToBlob(photo.photoDataUrl))
      })

      boothVideos.forEach((video, index) => {
        if (!video.videoBlob) return
        const extension = video.videoMimeType?.includes('mp4') ? 'mp4' : 'webm'
        videosFolder?.file(`booth-video-${String(index + 1).padStart(2, '0')}.${extension}`, video.videoBlob)
        if (video.videoThumbnailDataUrl) {
          const extension = extensionFromDataUrl(video.videoThumbnailDataUrl)
          videosFolder?.file(`booth-video-${String(index + 1).padStart(2, '0')}-thumb.${extension}`, dataUrlToBlob(video.videoThumbnailDataUrl))
        }
      })

      reactionHighlights.forEach((item, index) => {
        const baseName = `${String(index + 1).padStart(2, '0')}-${item.type}-${sanitizeFilePart(item.entry.name || item.entry.title || item.entry.id, item.type)}`
        topReactedFolder?.file(`${baseName}.json`, JSON.stringify({
          id: item.entry.id,
          type: item.type,
          reactions: item.total,
          breakdown: item.breakdown,
          timestamp: item.entry.timestamp,
          hasPhoto: !!item.entry.photoDataUrl,
          hasVideo: !!item.entry.videoBlob,
        }, null, 2))

        if (item.type === 'message') {
          topReactedFolder?.file(`${baseName}.txt`, buildMessageExportText(item.entry))
          if (item.entry.photoDataUrl) {
            const extension = extensionFromDataUrl(item.entry.photoDataUrl)
            topReactedFolder?.file(`${baseName}.${extension}`, dataUrlToBlob(item.entry.photoDataUrl))
          }
          if (item.entry.videoBlob) {
            const extension = item.entry.videoMimeType?.includes('mp4') ? 'mp4' : 'webm'
            topReactedFolder?.file(`${baseName}.${extension}`, item.entry.videoBlob)
          }
          if (item.entry.videoThumbnailDataUrl) {
            const extension = extensionFromDataUrl(item.entry.videoThumbnailDataUrl)
            topReactedFolder?.file(`${baseName}-thumb.${extension}`, dataUrlToBlob(item.entry.videoThumbnailDataUrl))
          }
        }

        if (item.type === 'photo' && item.entry.photoDataUrl) {
          const extension = extensionFromDataUrl(item.entry.photoDataUrl)
          topReactedFolder?.file(`${baseName}.${extension}`, dataUrlToBlob(item.entry.photoDataUrl))
        }

        if (item.type === 'video' && item.entry.videoBlob) {
          const extension = item.entry.videoMimeType?.includes('mp4') ? 'mp4' : 'webm'
          topReactedFolder?.file(`${baseName}.${extension}`, item.entry.videoBlob)
          if (item.entry.videoThumbnailDataUrl) {
            const extension = extensionFromDataUrl(item.entry.videoThumbnailDataUrl)
            topReactedFolder?.file(`${baseName}-thumb.${extension}`, dataUrlToBlob(item.entry.videoThumbnailDataUrl))
          }
        }
      })

      highlightsFolder?.file('summary.json', JSON.stringify({
        boothStrips: boothStrips.length,
        boothVideos: boothVideos.length,
        messageVideos: messageVideos.length,
        topReactedEntries: reactionHighlights.map((item) => ({
          id: item.entry.id,
          type: item.type,
          reactions: item.total,
          breakdown: item.breakdown,
        })),
        generatedAt: new Date().toISOString(),
      }, null, 2))

      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, 'jeannettes-guestbook-highlights.zip')
      setStatusMessage('The highlights bundle is ready to download.')
    } catch (err) {
      console.error('Highlights export failed:', err)
      setStatusMessage('The highlights bundle could not be created. Please try again.')
    } finally {
      setIsGeneratingHighlights(false)
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

  const handleSaveToFolder = async () => {
    setStatusMessage('')
    if (typeof window.showDirectoryPicker !== 'function') {
      setStatusMessage('Direct folder save is not supported in this browser. Downloading ZIP instead.')
      await handleZipExport()
      return
    }

    setIsSavingFolder(true)
    try {
      const root = await window.showDirectoryPicker({ mode: 'readwrite' })
      const messagesDir = await root.getDirectoryHandle('messages', { create: true })
      const messagePhotosDir = await root.getDirectoryHandle('message-photos', { create: true })
      const boothDir = await root.getDirectoryHandle('booth-photos', { create: true })

      const messagesSorted = [...messages].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

      for (let i = 0; i < messagesSorted.length; i++) {
        const message = messagesSorted[i]
        const index = String(i + 1).padStart(2, '0')
        const name = sanitizeFilePart(message.name || 'anonymous', 'anonymous')
        const baseName = `${index}-${name}`
        const messageText = buildMessageExportText(message)

        await writeFileToDirectory(messagesDir, `${baseName}.txt`, messageText)

        if (message.photoDataUrl) {
          const ext = extensionFromDataUrl(message.photoDataUrl)
          await writeFileToDirectory(messagePhotosDir, `${baseName}.${ext}`, dataUrlToBlob(message.photoDataUrl))
        }
      }

      for (let i = 0; i < boothPhotos.length; i++) {
        const photo = boothPhotos[i]
        if (!photo?.photoDataUrl) continue
        const index = String(i + 1).padStart(2, '0')
        const ext = extensionFromDataUrl(photo.photoDataUrl)
        const typeLabel = photo.isStrip ? 'strip' : 'photo'
        await writeFileToDirectory(boothDir, `${index}-booth-${typeLabel}.${ext}`, dataUrlToBlob(photo.photoDataUrl))
      }

      if (speech?.body) {
        await writeFileToDirectory(
          root,
          'speech.txt',
          `${speech.title || 'Speech'}${speech.author ? `\nBy: ${speech.author}` : ''}\n\n${speech.body}`
        )
      }

      if (notes.trim()) {
        await writeFileToDirectory(root, 'notes.txt', notes.trim())
      }

      await writeFileToDirectory(root, 'export-summary.txt', [
        `Messages: ${messages.length}`,
        `Message photos: ${messages.filter(m => m.photoDataUrl).length}`,
        `Booth photos: ${boothPhotos.length}`,
        `Booth videos: ${boothVideos.length}`,
        `Saved at: ${new Date().toISOString()}`
      ].join('\n'))

      setStatusMessage('Files were saved to the selected folder successfully.')
    } catch (err) {
      if (err?.name === 'AbortError') {
        setStatusMessage('Folder save was canceled.')
      } else {
        console.error('Folder save failed:', err)
        setStatusMessage('Could not save files to folder. Please try ZIP export instead.')
      }
    } finally {
      setIsSavingFolder(false)
    }
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
            <ExportPreviewErrorBoundary resetKey={`${estimatedPages}-${messages.length}-${boothPhotos.length}-${boothVideos.length}`}>
              <BookPreview
                messages={messages}
                boothPhotos={boothPhotos}
                boothVideos={boothVideos}
                speech={speech}
                sections={sections}
                notes={notes}
              />
            </ExportPreviewErrorBoundary>
          </div>

          <div className="export-editors">
            <div className="export-section">
              <SpeechEditor speech={speech} saveSpeech={saveSpeech} />
            </div>
            <div className="export-section">
              <NotesEditor notes={notes} onSave={(val) => setSetting('ebookNotes', val)} />
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
              <span className="export-stat-value">{messageVideos.length + boothVideos.length}</span>
            </div>
            <div className="export-stat">
              <span className="export-stat-label">Booth strips</span>
              <span className="export-stat-value">{boothStrips.length}</span>
            </div>
            <div className="export-stat">
              <span className="export-stat-label">Top reacted</span>
              <span className="export-stat-value">{reactionHighlights.length || '—'}</span>
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
              { key: 'videos',    icon: '🎥', label: 'Videos',            count: (messageVideos.length + boothVideos.length) || null, optin: true },
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
            className="export-btn export-btn-highlight"
            onClick={handleHighlightsExport}
            disabled={isGeneratingHighlights || !hasHighlightBundle}
          >
            {isGeneratingHighlights ? (
              <span className="export-btn-loading">⏳ Packing highlights…</span>
            ) : (
              <span>✨ Download Highlights Bundle</span>
            )}
          </button>

          {hasHighlightBundle && (
            <p className="export-highlights-hint">
              Includes {boothStrips.length} strips, {boothVideos.length} booth videos, and {reactionHighlights.length} top-reacted entries.
            </p>
          )}

          <button
            className="export-btn export-btn-zip"
            onClick={handleZipExport}
            disabled={isZipping || !hasAnyContent}
          >
            {isZipping ? (
              <span className="export-btn-loading">⏳ Creating ZIP…</span>
            ) : (
              <span>📦 Download ZIP Archive</span>
            )}
          </button>

          <button
            className="export-btn export-btn-folder"
            onClick={handleSaveToFolder}
            disabled={isSavingFolder || !hasAnyContent}
          >
            {isSavingFolder ? (
              <span className="export-btn-loading">⏳ Saving Files…</span>
            ) : (
              <span>💾 Save Files to Folder</span>
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
