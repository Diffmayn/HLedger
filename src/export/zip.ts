import JSZip from 'jszip'
import type { Entry, GuestbookEvent } from '@/types/domain'
import { download, extOf, fileStem, published, safeName } from './common'

export async function exportZip(event: GuestbookEvent, entries: Entry[], onProgress?: (p: number) => void) {
  const zip = new JSZip()
  const list = published(entries)
  const media = list.filter((e) => e.mediaUrl)
  let done = 0
  // Fetch four at a time; Storage handles it fine and it keeps memory bounded.
  const queue = [...media]
  const worker = async () => {
    while (queue.length) {
      const e = queue.shift()!
      const res = await fetch(e.mediaUrl!)
      if (res.ok) {
        const stamp = e.createdAt.replace(/[:T]/g, '-').slice(0, 19)
        zip.file(`${e.kind}/${stamp}-${safeName(e.authorName)}-${e.id.slice(0, 8)}.${extOf(e)}`, await res.blob())
      }
      onProgress?.(++done / media.length)
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  const text = list
    .filter((e) => e.body)
    .map((e) => `${e.createdAt}\n${e.authorName}\n${e.body}\n${e.emojis}\n`)
    .join('\n---\n\n')
  zip.file('messages.txt', text)
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  download(blob, `${fileStem(event)}.zip`)
}
