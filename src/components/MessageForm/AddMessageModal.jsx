import { useState, useEffect, useCallback } from 'react'
import confetti from 'canvas-confetti'
import EmojiPicker from './EmojiPicker'
import WebcamCapture from './WebcamCapture'
import { resizeImage } from '../../utils/imageUtils'
import { appendEmoji, removeEmojiAt, splitEmojiTokens } from '../../utils/emojiUtils'
import { createVideoMetadata, formatVideoDuration } from '../../utils/videoUtils'
import VideoCapture from '../Media/VideoCapture'
import './AddMessageModal.css'

export default function AddMessageModal({ onSubmit, onClose }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [emojis, setEmojis] = useState('')
  const [photo, setPhoto] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [videoAttachment, setVideoAttachment] = useState(null)
  const [showVideoCapture, setShowVideoCapture] = useState(false)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const emojiTokens = splitEmojiTokens(emojis)

  useEffect(() => {
    if (!videoAttachment?.videoBlob) {
      setVideoPreviewUrl('')
      return undefined
    }

    const nextUrl = URL.createObjectURL(videoAttachment.videoBlob)
    setVideoPreviewUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [videoAttachment])

  const processPhotoDataUrl = useCallback(async (dataUrl) => {
    try {
      const raw = String(dataUrl || '')
      if (!raw.startsWith('data:image/')) {
        setSubmitError('Please provide a valid image.')
        return null
      }
      const processed = await resizeImage(raw, 1280, 0.82)
      setSubmitError('')
      return processed
    } catch (err) {
      setSubmitError('Failed to process image: ' + (err?.message || 'Unknown error'))
      return null
    }
  }, [])

  const handleUploadFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      if (file.type.startsWith('video/')) {
        const metadata = await createVideoMetadata(file)
        setPhoto(null)
        setVideoAttachment(metadata)
        setShowCamera(false)
        setShowVideoCapture(false)
        setSubmitError('')
        return
      }

      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = String(reader.result || '')
        const processed = await processPhotoDataUrl(dataUrl)
        if (!processed) return
        setPhoto(processed)
        setVideoAttachment(null)
        setShowCamera(false)
        setShowVideoCapture(false)
      }
      reader.onerror = () => {
        setSubmitError('Failed to read file')
      }
      reader.readAsDataURL(file)
    } finally {
      event.target.value = ''
    }
  }

  const handleEmojiSelect = useCallback((emoji) => {
    setEmojis(prev => appendEmoji(prev, emoji))
  }, [])

  const handleEmojiRemove = useCallback((indexToRemove) => {
    setEmojis(prev => removeEmojiAt(prev, indexToRemove))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !message.trim()) return
    setSubmitting(true)
    setSubmitError('')

    try {
      // Photo is already resized and processed when captured/uploaded
      await onSubmit({
        name: name.trim(),
        message: message.trim(),
        emojis,
        photoDataUrl: photo || null,
        videoBlob: videoAttachment?.videoBlob || null,
        videoMimeType: videoAttachment?.videoMimeType || null,
        videoDuration: videoAttachment?.videoDuration || 0,
        videoThumbnailDataUrl: videoAttachment?.videoThumbnailDataUrl || null
      })

      // Reset form after successful submission
      setName('')
      setMessage('')
      setEmojis('')
      setPhoto(null)
      setVideoAttachment(null)
      setShowCamera(false)
      setShowVideoCapture(false)

      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C9A84C', '#722F37', '#E8D48B', '#FFD700', '#9B4D56']
      })
    } catch (error) {
      setSubmitError(error.message || 'Unable to post your message right now.')
    } finally {
      setSubmitting(false)
    }
  }

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <h2>Leave a Message for Jeannette ✨</h2>
          <p>Share your congratulations and warm wishes</p>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-layout">
            {/* Left column — text inputs */}
            <div className="modal-col">
              <div className="form-group">
                <label htmlFor="msg-name">Your Name</label>
                <input
                  id="msg-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  maxLength={50}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="msg-text">Your Message</label>
                <textarea
                  id="msg-text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write something nice for Jeannette..."
                  required
                  maxLength={500}
                  rows={5}
                />
                <span className="char-count">{message.length}/500</span>
              </div>

              <div className="form-group">
                <label>Emojis</label>
                <div className="emoji-row">
                  <div className="emoji-display">
                    {emojiTokens.length > 0 ? (
                      emojiTokens.map((emoji, index) => (
                        <button
                          key={`${emoji}-${index}`}
                          type="button"
                          className="emoji-pill"
                          onClick={() => handleEmojiRemove(index)}
                          aria-label={`Remove ${emoji}`}
                          title="Remove emoji"
                        >
                          <span className="emoji-pill-symbol">{emoji}</span>
                          <span className="emoji-pill-remove">✕</span>
                        </button>
                      ))
                    ) : (
                      <span className="emoji-placeholder">Tap a quick emoji or open the picker below.</span>
                    )}
                  </div>
                  {emojiTokens.length > 0 && (
                    <button type="button" className="emoji-clear" onClick={() => setEmojis('')}>✕</button>
                  )}
                </div>
                <EmojiPicker onSelect={handleEmojiSelect} />
              </div>
            </div>

            {/* Right column — photo */}
            <div className="modal-col">
              <label>Media (optional)</label>
              {photo ? (
                <div className="photo-preview">
                  <img src={photo} alt="Your captured photo" />
                  <div className="photo-preview-actions">
                    <button type="button" onClick={() => { setPhoto(null); setSubmitError(''); setShowVideoCapture(false); setShowCamera(true); }}>
                      ↻ Retake
                    </button>
                    <button type="button" onClick={() => setPhoto(null)}>
                      ✕ Remove
                    </button>
                  </div>
                </div>
              ) : videoAttachment ? (
                <div className="photo-preview">
                  {videoPreviewUrl && <video src={videoPreviewUrl} controls playsInline className="media-preview-video" />}
                  <div className="media-preview-meta">
                    <span>Video message</span>
                    <span>{formatVideoDuration(videoAttachment.videoDuration)}</span>
                  </div>
                  <div className="photo-preview-actions">
                    <button type="button" onClick={() => { setVideoAttachment(null); setSubmitError(''); setShowCamera(false); setShowVideoCapture(true); }}>
                      ↻ Record Again
                    </button>
                    <button type="button" onClick={() => setVideoAttachment(null)}>
                      ✕ Remove
                    </button>
                  </div>
                </div>
              ) : showCamera ? (
                <WebcamCapture
                  onCapture={async (dataUrl) => {
                    const processed = await processPhotoDataUrl(dataUrl)
                    if (!processed) return
                    setPhoto(processed)
                    setVideoAttachment(null)
                    setShowCamera(false)
                  }}
                  onClose={() => setShowCamera(false)}
                />
              ) : showVideoCapture ? (
                <VideoCapture
                  title="Record a congratulation video"
                  onCapture={(capturedVideo) => {
                    setVideoAttachment(capturedVideo)
                    setPhoto(null)
                    setShowVideoCapture(false)
                    setSubmitError('')
                  }}
                  onClose={() => setShowVideoCapture(false)}
                />
              ) : (
                <div className="photo-placeholder media-placeholder">
                  <div className="photo-placeholder-icon">🎞️</div>
                  <p>Add a photo or a video</p>
                  <span>This first implementation supports one attachment per message.</span>
                  <div className="media-placeholder-actions">
                    <button type="button" className="media-action-btn" onClick={() => { setSubmitError(''); setShowVideoCapture(false); setShowCamera(true) }}>
                      📷 Take Photo
                    </button>
                    <button type="button" className="media-action-btn" onClick={() => { setSubmitError(''); setShowCamera(false); setShowVideoCapture(true) }}>
                      🎥 Record Video
                    </button>
                  </div>
                  <label className="photo-upload-label">
                    Upload an image or video instead
                    <input type="file" accept="image/*,video/*" onChange={handleUploadFile} />
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            {submitError && <p className="modal-submit-error">{submitError}</p>}
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn-submit"
              disabled={!name.trim() || !message.trim() || submitting}
            >
              {submitting ? '...' : '✦ Post to Guestbook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
