import { useEffect } from 'react'
import useWebcam from '../../hooks/useWebcam'
import './WebcamCapture.css'

export default function WebcamCapture({ onCapture, onClose }) {
  const { videoRef, isReady, error, startCamera, stopCamera, captureFrame } = useWebcam()

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const handleCapture = () => {
    const dataUrl = captureFrame()
    if (dataUrl) {
      onCapture(dataUrl)
    }
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
        <button type="button" onClick={onClose} className="webcam-btn webcam-btn-secondary">✕ Cancel</button>
      </div>
    </div>
  )
}
