export function getSupportedRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''

  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4'
  ]

  return mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || ''
}

export function formatVideoDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round((durationMs || 0) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export async function createVideoMetadata(videoBlob) {
  if (!(videoBlob instanceof Blob) || !String(videoBlob.type || '').startsWith('video/')) {
    throw new Error('Please provide a valid video file.')
  }

  const objectUrl = URL.createObjectURL(videoBlob)

  try {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = objectUrl

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve
      video.onerror = () => reject(new Error('Failed to read video metadata.'))
    })

    const durationMs = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0

    await new Promise((resolve, reject) => {
      if (video.readyState >= 2) {
        resolve()
        return
      }
      video.onloadeddata = resolve
      video.onerror = () => reject(new Error('Failed to load video preview.'))
    })

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 360
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    return {
      videoBlob,
      videoMimeType: videoBlob.type || 'video/webm',
      videoDuration: durationMs,
      videoThumbnailDataUrl: canvas.toDataURL('image/jpeg', 0.82)
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}