// Client-side media preparation. Everything that goes to Storage passes through here
// so rows stay small and the wall only ever loads sized assets.

export interface PreparedImage {
  blob: Blob
  thumb: Blob
  width: number
  height: number
  mime: 'image/webp' | 'image/jpeg'
}

export interface PreparedVideo {
  blob: Blob
  poster: Blob
  width: number
  height: number
  durationMs: number
  mime: string
}

export const IMAGE_MAX_EDGE = 1600
export const THUMB_MAX_EDGE = 480
export const POSTER_MAX_EDGE = 960

let webpSupport: boolean | null = null

export async function supportsWebpEncode(): Promise<boolean> {
  if (webpSupport !== null) return webpSupport
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 2
    const blob = await canvasToBlob(c, 'image/webp', 0.8)
    webpSupport = blob.type === 'image/webp'
  } catch {
    webpSupport = false
  }
  return webpSupport
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), type, quality)
  })
}

export async function loadImage(source: Blob | string): Promise<HTMLImageElement> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    if (typeof source !== 'string') URL.revokeObjectURL(url)
  }
}

function fitWithin(w: number, h: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(w, h))
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

export function drawScaled(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  maxEdge: number,
): HTMLCanvasElement {
  const { width, height } = fitWithin(sw, sh, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Canvas 2D unavailable')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

/** Resizes a photo (file, blob or canvas) into an upload-ready image plus thumbnail. */
export async function prepareImage(source: Blob | HTMLCanvasElement): Promise<PreparedImage> {
  let drawable: CanvasImageSource
  let sw: number
  let sh: number
  if (source instanceof HTMLCanvasElement) {
    drawable = source
    sw = source.width
    sh = source.height
  } else {
    const img = await loadImage(source)
    drawable = img
    sw = img.naturalWidth
    sh = img.naturalHeight
  }
  const webp = await supportsWebpEncode()
  const mime = webp ? 'image/webp' : 'image/jpeg'
  const full = drawScaled(drawable, sw, sh, IMAGE_MAX_EDGE)
  const thumbCanvas = drawScaled(full, full.width, full.height, THUMB_MAX_EDGE)
  const [blob, thumb] = await Promise.all([
    canvasToBlob(full, mime, 0.86),
    canvasToBlob(thumbCanvas, mime, 0.78),
  ])
  return { blob, thumb, width: full.width, height: full.height, mime }
}

export function pickRecordingMimeType(withAudio = true): string {
  const candidates = withAudio
    ? [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
      ]
    : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
  if (typeof MediaRecorder === 'undefined') return ''
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? ''
}

export function extensionForMime(mime: string): string {
  if (mime.startsWith('image/webp')) return 'webp'
  if (mime.startsWith('image/png')) return 'png'
  if (mime.startsWith('image/')) return 'jpg'
  if (mime.startsWith('video/mp4')) return 'mp4'
  if (mime.startsWith('video/quicktime')) return 'mov'
  return 'webm'
}

/** Reads a video's dimensions/duration and grabs a poster frame. */
export async function prepareVideo(blob: Blob, mimeHint?: string): Promise<PreparedVideo> {
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('Could not read video'))
    })
    // MediaRecorder blobs often report Infinity until seeked to the end.
    let durationMs = Number.isFinite(video.duration) ? video.duration * 1000 : 0
    if (!durationMs) {
      durationMs = await new Promise<number>((resolve) => {
        video.currentTime = Number.MAX_SAFE_INTEGER
        video.ontimeupdate = () => {
          video.ontimeupdate = null
          resolve(Number.isFinite(video.duration) ? video.duration * 1000 : 0)
        }
      })
    }
    await seekTo(video, Math.min(0.4, Math.max(0, (durationMs / 1000) * 0.1)))
    const webp = await supportsWebpEncode()
    const canvas = drawScaled(video, video.videoWidth, video.videoHeight, POSTER_MAX_EDGE)
    const poster = await canvasToBlob(canvas, webp ? 'image/webp' : 'image/jpeg', 0.8)
    return {
      blob,
      poster,
      width: video.videoWidth,
      height: video.videoHeight,
      durationMs: Math.round(durationMs),
      mime: mimeHint || blob.type || 'video/webm',
    }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

function seekTo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - seconds) < 0.05 && video.readyState >= 2) return resolve()
    video.onseeked = () => resolve()
    video.currentTime = seconds
    setTimeout(resolve, 1500) // never hang on a broken seek
  })
}

/** Compose a vertical photo strip from 4 frames with a themed border. */
export async function composeStrip(
  frames: HTMLCanvasElement[],
  options: { background: string; label?: string; labelColor?: string } = { background: '#ffffff' },
): Promise<HTMLCanvasElement> {
  const frameW = 600
  const gap = 24
  const pad = 32
  const scaled = frames.map((f) => {
    const h = Math.round((f.height / f.width) * frameW)
    return { canvas: f, h }
  })
  const labelH = options.label ? 72 : 0
  const totalH = pad * 2 + scaled.reduce((s, f) => s + f.h, 0) + gap * (scaled.length - 1) + labelH
  const out = document.createElement('canvas')
  out.width = frameW + pad * 2
  out.height = totalH
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')
  ctx.fillStyle = options.background
  ctx.fillRect(0, 0, out.width, out.height)
  let y = pad
  for (const f of scaled) {
    ctx.drawImage(f.canvas, pad, y, frameW, f.h)
    y += f.h + gap
  }
  if (options.label) {
    ctx.fillStyle = options.labelColor ?? '#333333'
    ctx.font = '600 32px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(options.label, out.width / 2, totalH - pad - labelH / 2 + 8)
  }
  return out
}
