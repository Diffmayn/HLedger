import { useState, useRef, useCallback, useEffect } from 'react'
import useWebcam from '../../hooks/useWebcam'
import useFaceTracking from '../../hooks/useFaceTracking'
import FilterOverlay from '../FaceFilter/FilterOverlay'
import FilterSelector from '../FaceFilter/FilterSelector'
import './WebcamCapture.css'

export default function WebcamCapture({ onCapture, onClose }) {
  const { videoRef, isReady, error, startCamera, stopCamera, captureFrame } = useWebcam()
  const { landmarks, isTracking, isLoading, trackingError, faceCount, start: startTracking, stop: stopTracking } = useFaceTracking(videoRef)
  const [activeFilters, setActiveFilters] = useState([])
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [videoDimensions, setVideoDimensions] = useState({ width: 1280, height: 720 })
  const overlayRef = useRef(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
      stopTracking()
    }
  }, [])

  useEffect(() => {
    if (isReady) {
      startTracking()
      const video = videoRef.current
      if (video) {
        const updateDims = () => setVideoDimensions({ width: video.videoWidth, height: video.videoHeight })
        video.addEventListener('loadedmetadata', updateDims)
        if (video.videoWidth) updateDims()
        return () => video.removeEventListener('loadedmetadata', updateDims)
      }
    }
  }, [isReady])

  const toggleFilter = useCallback((filter) => {
    if (filter === null) {
      setActiveFilters([])
      return
    }
    setActiveFilters(prev => {
      const exists = prev.find(f => f.id === filter.id)
      if (exists) return prev.filter(f => f.id !== filter.id)
      // Only one per type
      return [...prev.filter(f => f.type !== filter.type), filter]
    })
  }, [])

  const handleCapture = () => {
    const overlayCanvas = overlayRef.current?.getCanvas()
    const dataUrl = captureFrame(overlayCanvas)
    if (dataUrl) {
      setCapturedPhoto(dataUrl)
    }
  }

  const handleUsePhoto = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto)
    }
  }

  const handleRetake = () => {
    setCapturedPhoto(null)
  }

  if (error) {
    return (
      <div className="webcam-capture">
        <div className="webcam-error">
          <div className="webcam-error-icon">📷</div>
          <p>Camera not available</p>
          <span className="webcam-error-detail">{error}</span>
          <button type="button" onClick={onClose} className="webcam-btn webcam-btn-secondary">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="webcam-capture">
      {capturedPhoto ? (
        <div className="webcam-preview-result">
          <img src={capturedPhoto} alt="Captured" className="webcam-result-img" />
          <div className="webcam-result-actions">
            <button type="button" onClick={handleUsePhoto} className="webcam-btn webcam-btn-capture">✓ Use This Photo</button>
            <button type="button" onClick={handleRetake} className="webcam-btn webcam-btn-secondary">↻ Retake</button>
            <button type="button" onClick={onClose} className="webcam-btn webcam-btn-secondary">✕ Cancel</button>
          </div>
          <p className="webcam-result-hint">Review your photo and click "Use This Photo" to add it</p>
        </div>
      ) : (
        <>
          <div className="webcam-video-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="webcam-video"
            />
            <FilterOverlay
              ref={overlayRef}
              videoRef={videoRef}
              landmarks={landmarks}
              activeFilters={activeFilters}
              width={videoDimensions.width}
              height={videoDimensions.height}
            />
            {isLoading && (
              <div className="webcam-loading">
                <div className="webcam-loading-spinner" />
                <span>Loading face tracking...</span>
              </div>
            )}
            {trackingError && !isLoading && (
              <div className="webcam-hint">
                <span>Face accessories are unavailable right now. Try adjusting your position or lighting.</span>
              </div>
            )}
            {isTracking && faceCount === 0 && !isLoading && (
              <div className="webcam-hint">
                <span>Move closer to the camera</span>
              </div>
            )}
            {faceCount > 0 && (
              <div className="webcam-face-indicator">
                {faceCount} {faceCount === 1 ? 'face' : 'faces'} detected
              </div>
            )}
          </div>

          <FilterSelector activeFilters={activeFilters} onToggle={toggleFilter} />

          <div className="webcam-actions">
            <button type="button" onClick={handleCapture} className="webcam-btn webcam-btn-capture" disabled={!isReady}>
              📸 Take Photo
            </button>
            <button type="button" onClick={onClose} className="webcam-btn webcam-btn-secondary">Skip Photo</button>
          </div>
        </>
      )}
    </div>
  )
}
