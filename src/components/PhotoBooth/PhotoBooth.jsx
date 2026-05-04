import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useWebcam from '../../hooks/useWebcam'
import useFaceTracking from '../../hooks/useFaceTracking'
import useBroadcastChannel from '../../hooks/useBroadcastChannel'
import { useBoothPhotos, useBoothVideos } from '../../hooks/useDatabase'
import FilterOverlay from '../FaceFilter/FilterOverlay'
import FilterSelector from '../FaceFilter/FilterSelector'
import PhotoStrip from './PhotoStrip'
import VideoCapture from '../Media/VideoCapture'
import { composePhotoStrip } from '../../utils/imageUtils'
import './PhotoBooth.css'

export default function PhotoBooth() {
  const navigate = useNavigate()
  const { videoRef, isReady, error, startCamera, stopCamera, captureFrame } = useWebcam()
  const { landmarks, isTracking, isLoading, trackingError, faceCount, start: startTracking, stop: stopTracking } = useFaceTracking(videoRef)
  const { addBoothPhoto } = useBoothPhotos()
  const { addBoothVideo } = useBoothVideos()
  const { broadcast } = useBroadcastChannel()
  const overlayRef = useRef(null)

  const [activeFilters, setActiveFilters] = useState([])
  const [capturedFrames, setCapturedFrames] = useState([])
  const [countdown, setCountdown] = useState(null)
  const [flashActive, setFlashActive] = useState(false)
  const [showStrip, setShowStrip] = useState(false)
  const [videoDimensions, setVideoDimensions] = useState({ width: 1280, height: 720 })
  const [saveError, setSaveError] = useState('')
  const [isSavingStrip, setIsSavingStrip] = useState(false)
  const [showVideoCapture, setShowVideoCapture] = useState(false)

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
    if (filter === null) { setActiveFilters([]); return }
    setActiveFilters(prev => {
      const exists = prev.find(f => f.id === filter.id)
      if (exists) return prev.filter(f => f.id !== filter.id)
      return [...prev.filter(f => f.type !== filter.type), filter]
    })
  }, [])

  const captureWithFlash = useCallback(() => {
    const overlayCanvas = overlayRef.current?.getCanvas()
    const dataUrl = captureFrame(overlayCanvas)
    if (dataUrl) {
      setFlashActive(true)
      setTimeout(() => setFlashActive(false), 200)
      return dataUrl
    }
    return null
  }, [captureFrame])

  const startCountdown = useCallback(() => {
    if (countdown !== null) return
    const totalPhotos = 4
    let sec = 3
    setCountdown(sec)

    const interval = setInterval(() => {
      sec--
      if (sec > 0) {
        setCountdown(sec)
      } else {
        setCountdown(null)
        clearInterval(interval)

        // Take photos in sequence
        const frames = []
        const takePhoto = (index) => {
          if (index >= totalPhotos) {
            setCapturedFrames(frames)
            setShowStrip(true)
            return
          }
          const dataUrl = captureWithFlash()
          if (dataUrl) frames.push(dataUrl)

          if (index < totalPhotos - 1) {
            setTimeout(() => {
              setCountdown(3)
              let inner = 3
              const innerInterval = setInterval(() => {
                inner--
                if (inner > 0) {
                  setCountdown(inner)
                } else {
                  setCountdown(null)
                  clearInterval(innerInterval)
                  takePhoto(index + 1)
                }
              }, 1000)
            }, 600)
          } else {
            takePhoto(index + 1)
          }
        }
        takePhoto(0)
      }
    }, 1000)
  }, [countdown, captureWithFlash])

  const handleSingleCapture = () => {
    const dataUrl = captureWithFlash()
    if (dataUrl) {
      setSaveError('')
      setCapturedFrames([dataUrl])
      setShowStrip(true)
    }
  }

  const handleSaveStrip = async () => {
    setSaveError('')
    setIsSavingStrip(true)
    try {
      // Compose all frames into a single photo-strip image when there are multiple shots
      const photoDataUrl =
        capturedFrames.length > 1
          ? await composePhotoStrip(capturedFrames)
          : capturedFrames[0]

      const id = await addBoothPhoto({
        photoDataUrl,
        caption: '',
        filtersUsed: activeFilters.map(f => f.id),
        isStrip: capturedFrames.length > 1,
      })
      broadcast('NEW_BOOTH_PHOTO', { id, photoDataUrl, timestamp: Date.now() })

      setShowStrip(false)
      setCapturedFrames([])
      navigate('/')
    } catch (err) {
      setSaveError(err?.message || 'Could not save photo strip. Please try again.')
    } finally {
      setIsSavingStrip(false)
    }
  }

  const handleRetake = () => {
    setSaveError('')
    setShowStrip(false)
    setCapturedFrames([])
  }

  const openVideoCapture = () => {
    setSaveError('')
    setShowStrip(false)
    setCapturedFrames([])
    stopTracking()
    stopCamera()
    setShowVideoCapture(true)
  }

  const closeVideoCapture = async () => {
    setShowVideoCapture(false)
    await startCamera()
  }

  const handleSaveVideo = async (capturedVideo) => {
    setSaveError('')
    try {
      const id = await addBoothVideo({
        ...capturedVideo,
        source: 'booth',
        filtersUsed: activeFilters.map(filter => filter.id),
      })
      broadcast('NEW_BOOTH_VIDEO', { id, timestamp: Date.now() })
      await closeVideoCapture()
      navigate('/')
    } catch (err) {
      setSaveError(err?.message || 'Could not save video right now. Please try again.')
    }
  }

  if (error) {
    return (
      <div className="booth-page">
        <div className="booth-error">
          <div className="booth-error-icon">📷</div>
          <h2>Camera Not Available</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="booth-page">
      <div className="booth-header">
        <h2>📸 Photo Booth</h2>
        <p>Strike a pose, add face accessories, and capture memories.</p>
      </div>

      <div className="booth-layout">
        <div className="booth-camera-section">
          <div className="booth-camera-container">
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="booth-video"
            />
            <FilterOverlay
              ref={overlayRef}
              videoRef={videoRef}
              landmarks={landmarks}
              activeFilters={activeFilters}
              width={videoDimensions.width}
              height={videoDimensions.height}
            />
            {countdown !== null && (
              <div className="booth-countdown">
                <span>{countdown}</span>
              </div>
            )}
            {flashActive && <div className="booth-flash" />}
            {isLoading && (
              <div className="booth-loading">Loading face tracking...</div>
            )}
            {trackingError && !isLoading && (
              <div className="booth-tracking-warning">Face accessories are unavailable right now. Try adjusting your position or lighting.</div>
            )}
            {isTracking && faceCount > 0 && (
              <div className="booth-face-count">
                {faceCount} {faceCount === 1 ? 'face' : 'faces'}
              </div>
            )}
          </div>

          <FilterSelector activeFilters={activeFilters} onToggle={toggleFilter} />

          <div className="booth-controls">
            <button className="booth-btn booth-btn-strip" onClick={startCountdown} disabled={countdown !== null || !isReady}>
              🎞️ Photo Strip (4 shots)
            </button>
            <button className="booth-btn booth-btn-single" onClick={handleSingleCapture} disabled={countdown !== null || !isReady}>
              📸 Single Shot
            </button>
            <button className="booth-btn booth-btn-video" onClick={openVideoCapture} disabled={countdown !== null}>
              🎥 Record Video
            </button>
          </div>
        </div>

      </div>

      {showStrip && capturedFrames.length > 0 && (
        <div className="booth-strip-overlay">
          <div className="booth-strip-content">
            <button className="booth-strip-close" onClick={handleRetake} aria-label="Close preview">✕</button>
            <PhotoStrip frames={capturedFrames} />
            {saveError && <p className="booth-strip-error">{saveError}</p>}
            <div className="booth-strip-actions">
              <button className="booth-btn booth-btn-single" onClick={handleRetake} disabled={isSavingStrip}>↻ Retake</button>
              <button className="booth-btn booth-btn-strip" onClick={handleSaveStrip} disabled={isSavingStrip}>{isSavingStrip ? 'Saving...' : '💾 Save to Gallery'}</button>
            </div>
          </div>
        </div>
      )}

      {showVideoCapture && (
        <div className="booth-strip-overlay">
          <div className="booth-strip-content booth-strip-content--video">
            <button className="booth-strip-close" onClick={closeVideoCapture} aria-label="Close recorder">✕</button>
            <VideoCapture
              title="Record a booth video"
              onCapture={handleSaveVideo}
              onClose={closeVideoCapture}
            />
            {saveError && <p className="booth-strip-error">{saveError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
