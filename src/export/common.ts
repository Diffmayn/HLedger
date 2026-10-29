import { saveAs } from 'file-saver'
import type { Entry, GuestbookEvent } from '@/types/domain'

export function published(entries: Entry[]): Entry[] {
  return entries.filter((e) => e.status === 'published').slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function fileStem(event: GuestbookEvent): string {
  return `${event.slug}-guestbook-${new Date().toISOString().slice(0, 10)}`
}

export function download(blob: Blob, name: string) {
  saveAs(blob, name)
}

export function extOf(entry: Entry): string {
  const m = entry.mediaPath?.match(/\.([a-z0-9]+)$/i)
  return m?.[1] ?? 'bin'
}

export function safeName(value: string, fallback = 'guest'): string {
  const s = value.replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '-').slice(0, 40)
  return s || fallback
}

/** Fetches a Storage image and re-encodes it as JPEG bytes (PDF libraries do not read WebP). */
export async function fetchAsJpeg(url: string, maxEdge = 1400): Promise<Uint8Array> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not fetch ${url}`)
  const blob = await res.blob()
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const jpeg = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.85),
  )
  return new Uint8Array(await jpeg.arrayBuffer())
}
