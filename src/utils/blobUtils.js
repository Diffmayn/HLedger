export function dataUrlToBlob(dataUrl) {
  if (!dataUrl || !String(dataUrl).includes(',')) {
    throw new Error('Invalid data URL.')
  }

  const [header, base64] = String(dataUrl).split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new Blob([bytes], { type: mime })
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    if (!(blob instanceof Blob)) {
      reject(new Error('Expected a Blob.'))
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read blob as data URL.'))
    reader.readAsDataURL(blob)
  })
}
