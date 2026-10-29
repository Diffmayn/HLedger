import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { Entry, GuestbookEvent } from '@/types/domain'
import { supabase } from '@/lib/supabase'
import { download, fetchAsJpeg, fileStem, published } from './common'

// A5-ish portrait keepsake book: cover, one entry per page (or two short messages), speech at the end.
const PAGE = { w: 420, h: 595 } // A5 in points
const MARGIN = 36

function stripUnsupported(text: string): string {
  // Standard fonts are WinAnsi: keep Latin-1 (incl. æøå), drop emoji and other symbols.
  return text.replace(/[^\u0000-ÿ–—‘’“”…]/g, '').trim()
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = []
  for (const para of text.split(/\r?\n/)) {
    let line = ''
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line)
        line = word
      } else line = next
    }
    lines.push(line)
  }
  return lines
}

export async function exportBookPdf(event: GuestbookEvent, entries: Entry[], onProgress?: (p: number) => void) {
  const doc = await PDFDocument.create()
  doc.setTitle(`${event.title} — Guestbook`)
  const serif = await doc.embedFont(StandardFonts.TimesRoman)
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const italic = await doc.embedFont(StandardFonts.TimesRomanItalic)
  const ink = rgb(0.16, 0.11, 0.08)
  const soft = rgb(0.55, 0.48, 0.42)

  // Cover
  const cover = doc.addPage([PAGE.w, PAGE.h])
  centered(cover, stripUnsupported(event.title), serifBold, 30, PAGE.h / 2 + 20, ink)
  if (event.subtitle) centered(cover, stripUnsupported(event.subtitle), italic, 14, PAGE.h / 2 - 10, soft)
  centered(cover, new Date().toLocaleDateString(), serif, 11, MARGIN + 10, soft)

  const list = published(entries)
  let i = 0
  for (const e of list) {
    const page = doc.addPage([PAGE.w, PAGE.h])
    let y = PAGE.h - MARGIN
    if (e.mediaUrl && e.kind !== 'video') {
      try {
        const bytes = await fetchAsJpeg(e.mediaUrl)
        const img = await doc.embedJpg(bytes)
        const maxW = PAGE.w - MARGIN * 2
        const maxH = e.kind === 'strip' ? PAGE.h - MARGIN * 2 - 60 : 300
        const s = Math.min(maxW / img.width, maxH / img.height)
        const w = img.width * s
        const h = img.height * s
        page.drawImage(img, { x: (PAGE.w - w) / 2, y: y - h, width: w, height: h })
        y -= h + 18
      } catch {
        /* skip broken image */
      }
    } else if (e.kind === 'video' && e.thumbUrl) {
      try {
        const bytes = await fetchAsJpeg(e.thumbUrl)
        const img = await doc.embedJpg(bytes)
        const w = PAGE.w - MARGIN * 2
        const h = (img.height / img.width) * w
        page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h })
        page.drawText('Video message', { x: MARGIN, y: y - h - 14, size: 9, font: italic, color: soft })
        y -= h + 28
      } catch {
        /* skip */
      }
    }
    const body = stripUnsupported(e.body)
    if (body) {
      const size = body.length > 400 ? 11 : body.length > 160 ? 13 : 16
      for (const line of wrap(body, serif, size, PAGE.w - MARGIN * 2)) {
        if (y < MARGIN + 40) break
        page.drawText(line, { x: MARGIN, y: y - size, size, font: serif, color: ink })
        y -= size * 1.4
      }
      y -= 10
    }
    page.drawText(`— ${stripUnsupported(e.authorName) || 'A guest'}`, { x: MARGIN, y: Math.max(MARGIN, y - 14), size: 12, font: serifBold, color: ink })
    page.drawText(new Date(e.createdAt).toLocaleString(), { x: MARGIN, y: MARGIN - 14, size: 8, font: serif, color: soft })
    onProgress?.(++i / (list.length + 1))
  }

  // Speech
  const { data: speech } = await supabase().from('speech').select('*').eq('event_id', event.id).maybeSingle()
  if (speech?.body) {
    let page = doc.addPage([PAGE.w, PAGE.h])
    let y = PAGE.h - MARGIN
    if (speech.title) {
      page.drawText(stripUnsupported(speech.title), { x: MARGIN, y: y - 22, size: 22, font: serifBold, color: ink })
      y -= 40
    }
    for (const line of wrap(stripUnsupported(speech.body), serif, 12, PAGE.w - MARGIN * 2)) {
      if (y < MARGIN + 20) {
        page = doc.addPage([PAGE.w, PAGE.h])
        y = PAGE.h - MARGIN
      }
      page.drawText(line, { x: MARGIN, y: y - 12, size: 12, font: serif, color: ink })
      y -= 17
    }
    if (speech.author) page.drawText(`— ${stripUnsupported(speech.author)}`, { x: MARGIN, y: Math.max(MARGIN, y - 24), size: 12, font: italic, color: soft })
  }

  const bytes = await doc.save()
  download(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${fileStem(event)}.pdf`)
}

function centered(page: PDFPage, text: string, font: PDFFont, size: number, y: number, color: ReturnType<typeof rgb>) {
  const w = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: (PAGE.w - w) / 2, y, size, font, color })
}
