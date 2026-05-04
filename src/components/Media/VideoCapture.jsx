import { useEffect, useState } from 'react'
import useMediaRecorder from '../../hooks/useMediaRecorder'
import { createVideoMetadata, formatVideoDuration } from '../../utils/videoUtils'
import './VideoCapture.css'

export default function VideoCapture({ onCapture, onClose, title = 'Record a video message' }) {
  const {
    previewRef,
    isReady,
    isRecording,
    durationMs,
    error,
    startPreview,
    stopPreview,
    startRecording,
    stopRecording
  } = useMediaRecorder()

  const [capturedVideo, setCapturedVideo] = useState(null)
  const [capturedUrl, setCapturedUrl] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    startPreview()
    return () => stopPreview()
  }, [startPreview, stopPreview])

  useEffect(() => {
    if (!capturedVideo?.videoBlob) {
      setCapturedUrl('')
      return undefined
    }

    const nextUrl = URL.createObjectURL(capturedVideo.videoBlob)
    setCapturedUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [capturedVideo])

  const handleStartRecording = async () => {
    setSubmitError('')
    setCapturedVideo(null)
    await startRecording()
  }

  const handleStopRecording = async () => {
    setSubmitError('')
    setIsBusy(true)
    try {
      const result = await stopRecording()
      if (!result?.blob) return
      const metadata = await createVideoMetadata(result.blob)
      setCapturedVideo({
        ...metadata,
        videoDuration: result.durationMs || metadata.videoDuration
      })
      stopPreview()
    } catch (err) {
      setSubmitError(err?.message || 'Could not finish the recording.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleRetake = async () => {
    setSubmitError('')
    setCapturedVideo(null)
    await startPreview()
  }

  const handleUseVideo = () => {
    if (!capturedVideo) return
    onCapture(capturedVideo)
  }

  return (
    <div className="video-capture">
      <div className="video-capture-header">
        <h3>{title}</h3>
        <p>Record as long as you need. Audio is included when your browser allows it.</p>
      </div>

      {capturedVideo ? (
        <div className="video-capture-result">
          <video src={capturedUrl} controls playsInline className="video-capture-player" />
          <div className="video-capture-meta">
            <span>Duration: {formatVideoDuration(capturedVideo.videoDuration)}</span>
            <span>Type: {capturedVideo.videoMimeType || 'video/webm'}</span>
          </div>
          <div className="video-capture-actions">
            <button type="button" className="video-capture-btn video-capture-btn-secondary" onClick={handleRetake}>
              ↻ Retake
            </button>
            <button type="button" className="video-capture-btn video-capture-btn-primary" onClick={handleUseVideo}>
              ✓ Use This Video
            </button>
            <button type="button" className="video-capture-btn video-capture-btn-secondary" onClick={onClose}>
              ✕ Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="video-capture-preview-wrap">
            <video ref={previewRef} autoPlay playsInline muted={!isRecording} className="video-capture-preview" />
            <div className="video-capture-status-row">
              <span className={`video-capture-status${isRecording ? ' is-recording' : ''}`}>
                {isRecording ? `Recording ${formatVideoDuration(durationMs)}` : isReady ? 'Camera ready' : 'Waiting for camera'}
              </span>
            </div>
          </div>
          <div className="video-capture-actions">
            {!isRecording ? (
              <button type="button" className="video-capture-btn video-capture-btn-primary" onClick={handleStartRecording} disabled={!isReady || isBusy}>
                🎥 Start Recording
              </button>
            ) : (
              <button type="button" className="video-capture-btn video-capture-btn-stop" onClick={handleStopRecording} disabled={isBusy}>
                ■ Stop Recording
              </button>
            )}
            <button type="button" className="video-capture-btn video-capture-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      )}

      {(submitError || error) && <p className="video-capture-error">{submitError || error}</p>}
    </div>
  )
}