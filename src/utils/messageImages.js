import { splitEmojiTokens } from './emojiUtils'
import { formatVideoDuration } from './videoUtils'

// Font chain that falls back to the platform colour-emoji font so message text
// and emojis render together (Segoe UI Emoji on Windows, Apple Color Emoji on
// macOS, Noto on Linux).
const FONT_STACK = '"Segoe UI","Helvetica Neue",system-ui,"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",Arial,sans-serif'
const font = (px, style = '') => `${style}${px}px ${FONT_STACK}`.trim()

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

// Word-wrap `text` to `maxWidth`, breaking over-long words (or emoji runs) by
// grapheme. Honours explicit newlines.
function wrapText(ctx, text, maxWidth) {
  const lines = []
  String(text || '').split('\n').forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      return
    }
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate
        continue
      }
      if (current) lines.push(current)
      if (ctx.measureText(word).width > maxWidth) {
        let chunk = ''
        for (const grapheme of splitEmojiTokens(word)) {
          if (chunk && ctx.measureText(chunk + grapheme).width > maxWidth) {
            lines.push(chunk)
            chunk = grapheme
          } else {
            chunk += grapheme
          }
        }
        current = chunk
      } else {
        current = word
      }
    }
    if (current) lines.push(current)
  })
  return lines
}

/**
 * Render a single guest message to a self-contained PNG that mirrors the book
 * preview card (cream background, gold left bar, photo, message, emojis, name).
 * Returns a PNG data URL, or null if canvas isn't available.
 *
 * Sized for photo-book printing — at the default 1200px width / 2× scale the
 * output is 2400px wide, plenty for a Pixum page.
 */
export async function renderMessageCardImage(msg, { width = 1200, scale = 2 } = {}) {
  if (typeof document === 'undefined') return null

  const pad = 64
  const barWidth = 16
  const innerLeft = pad + barWidth + 28
  const contentWidth = width - innerLeft - pad

  const msgFontPx = 40
  const msgLineH = msgFontPx * 1.45
  const emojiFontPx = 54
  const emojiLineH = emojiFontPx * 1.2
  const captionFontPx = 26
  const nameFontPx = 38

  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) return null

  // Photo / video thumbnail.
  const photoSrc = msg.photoDataUrl || msg.videoThumbnailDataUrl || null
  const isVideo = !msg.photoDataUrl && !!msg.videoThumbnailDataUrl
  let photo = null
  if (photoSrc) {
    try { photo = await loadImage(photoSrc) } catch { photo = null }
  }
  let photoW = 0
  let photoH = 0
  if (photo) {
    const ratio = Math.min(contentWidth / photo.width, 760 / photo.height)
    photoW = photo.width * ratio
    photoH = photo.height * ratio
  }

  // Message text lines.
  measure.font = font(msgFontPx)
  const msgLines = msg.message ? wrapText(measure, msg.message, contentWidth) : []

  // Picker emoji field.
  const emojiText = splitEmojiTokens(msg.emojis).join('')

  // Measure total height.
  let y = pad
  if (photo) {
    y += photoH + 20 // mat
    if (isVideo) y += captionFontPx + 8
    y += 40
  }
  y += msgLines.length * msgLineH
  if (emojiText) y += 18 + emojiLineH
  y += 32 + nameFontPx * 1.3
  y += pad
  const height = Math.ceil(y)

  // Draw.
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(scale, scale)

  ctx.fillStyle = '#FDF6E3'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = 'rgba(201,168,76,0.45)'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, width - 2, height - 2)
  ctx.fillStyle = '#C9A84C'
  ctx.fillRect(pad, pad, barWidth, height - pad * 2)

  let cy = pad

  if (photo) {
    const px = innerLeft + (contentWidth - photoW) / 2
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(px - 10, cy - 10, photoW + 20, photoH + 20)
    ctx.drawImage(photo, px, cy, photoW, photoH)
    cy += photoH + 20
    if (isVideo) {
      ctx.fillStyle = '#9B8A7C'
      ctx.font = font(captionFontPx, 'italic ')
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(`▶ Video · ${formatVideoDuration(msg.videoDuration)}`, innerLeft + contentWidth / 2, cy)
      ctx.textAlign = 'left'
      cy += captionFontPx + 8
    }
    cy += 40
  }

  ctx.fillStyle = '#3C2415'
  ctx.font = font(msgFontPx)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  msgLines.forEach((line) => {
    ctx.fillText(line, innerLeft, cy + (msgLineH - msgFontPx) / 2)
    cy += msgLineH
  })

  if (emojiText) {
    cy += 18
    ctx.font = font(emojiFontPx)
    ctx.fillText(emojiText, innerLeft, cy)
    cy += emojiLineH
  }

  cy += 32
  ctx.font = font(nameFontPx, 'italic ')
  ctx.fillStyle = '#9C7A22'
  ctx.textAlign = 'right'
  ctx.fillText(`— ${msg.name || 'Anonymous'}`, width - pad, cy)

  return canvas.toDataURL('image/png')
}
