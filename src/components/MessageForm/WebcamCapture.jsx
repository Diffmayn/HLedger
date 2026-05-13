import { useState, useEffect } from 'react'
import useWebcam from '../../hooks/useWebcam'
import './WebcamCapture.css'

export default function WebcamCapture({ onCapture, onClose }) {
  const { videoRef, isReady, error, startCamera, stopCamera, captureFrame } = useWebcam()
  const [capturedPhoto, setCapturedPhoto] = useState(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const handleCapture = () => {
    const dataUrl = captureFrame()
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
          </div>

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
