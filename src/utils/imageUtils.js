export function resizeImage(dataUrl, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!dataUrl || typeof dataUrl !== 'string') {
      reject(new Error('Invalid image data'))
      return
    }
    const img = new Image()
    img.onload = () => {
      try {
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(width)
        canvas.height = Math.round(height)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image for resizing'))
    img.src = dataUrl
  })
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Compose multiple photo frames into a single photo-booth strip image.
 * Returns a Promise that resolves to a JPEG data URL.
 */
export async function composePhotoStrip(frames) {
  const stripWidth = 400
  // Crop each 16:9 frame to 4:3 (wider crop) for a classic booth feel
  const photoWidth = stripWidth
  const photoHeight = Math.round(stripWidth * 0.75) // 4:3
  const headerHeight = 88
  const footerHeight = 56
  const separatorH = 4 // dark divider between photos

  const n = frames.length
  const totalHeight =
    headerHeight +
    photoHeight * n +
    separatorH * (n - 1) +
    footerHeight

  const canvas = document.createElement('canvas')
  canvas.width = stripWidth
  canvas.height = totalHeight
  const ctx = canvas.getContext('2d')

  // ── whole background ────────────────────────────────────────────────────────
  ctx.fillStyle = '#1a0010'
  ctx.fillRect(0, 0, stripWidth, totalHeight)

  // ── header block ────────────────────────────────────────────────────────────
  // Cream header
  ctx.fillStyle = '#fffdf7'
  ctx.fillRect(0, 0, stripWidth, headerHeight)
  // Thin gold bottom border on header
  ctx.fillStyle = '#c9a84c'
  ctx.fillRect(0, headerHeight - 3, stripWidth, 3)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Gold star
  ctx.fillStyle = '#c9a84c'
  ctx.font = '15px Georgia, serif'
  ctx.fillText('✦', stripWidth / 2, 20)

  // Title
  ctx.fillStyle = '#2d0a1e'
  ctx.font = 'bold 22px Georgia, serif'
  ctx.fillText("Jeannette's 25th", stripWidth / 2, 47)

  // Sub-label
  ctx.fillStyle = '#7a5a4a'
  ctx.font = '10px Arial, sans-serif'
  ctx.fillText('ANNIVERSARY CELEBRATION', stripWidth / 2, 70)

  // ── photos ──────────────────────────────────────────────────────────────────
  for (let i = 0; i < n; i++) {
    const img = await loadImage(frames[i])
    const y = headerHeight + i * (photoHeight + separatorH)

    // Center-crop 16:9 → 4:3
    const srcAspect = img.width / img.height
    const dstAspect = photoWidth / photoHeight
    let sx, sy, sw, sh
    if (srcAspect > dstAspect) {
      sh = img.height
      sw = Math.round(img.height * dstAspect)
      sx = Math.round((img.width - sw) / 2)
      sy = 0
    } else {
      sw = img.width
      sh = Math.round(img.width / dstAspect)
      sx = 0
      sy = Math.round((img.height - sh) / 2)
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, y, photoWidth, photoHeight)

    // Dark separator below photo (except last)
    if (i < n - 1) {
      ctx.fillStyle = '#1a0010'
      ctx.fillRect(0, y + photoHeight, stripWidth, separatorH)
    }
  }

  // ── footer block ────────────────────────────────────────────────────────────
  const footerY = headerHeight + photoHeight * n + separatorH * (n - 1)
  // Thin gold top border on footer
  ctx.fillStyle = '#c9a84c'
  ctx.fillRect(0, footerY, stripWidth, 3)

  ctx.fillStyle = '#fffdf7'
  ctx.fillRect(0, footerY + 3, stripWidth, footerHeight - 3)

  ctx.fillStyle = '#7a5a4a'
  ctx.font = '11px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(
    `Salling Group · ${new Date().toLocaleDateString('da-DK')}`,
    stripWidth / 2,
    footerY + footerHeight / 2 + 2
  )

  return canvas.toDataURL('image/jpeg', 0.93)
}

export function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(data)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i)
  }
  return new Blob([array], { type: mime })
}
