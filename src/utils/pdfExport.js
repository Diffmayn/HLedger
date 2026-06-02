import { formatVideoDuration } from './videoUtils'
import { splitEmojiTokens } from './emojiUtils'

// pdfmake embeds the Roboto font, which has no emoji glyphs, so emojis would
// render as blank boxes. Render the emoji string to a PNG using the platform's
// colour-emoji font (Segoe UI Emoji on Windows, Apple Color Emoji on macOS,
// Noto on Linux) so it can be embedded as an image — the same emojis the guest
// picked then appear in the printed book.
function renderEmojiImage(emojiString, size = 72) {
  try {
    if (typeof document === 'undefined') return null
    const tokens = splitEmojiTokens(emojiString)
    if (!tokens.length) return null

    const text = tokens.join('')
    const font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif`

    const measureCtx = document.createElement('canvas').getContext('2d')
    if (!measureCtx) return null
    measureCtx.font = font
    const width = Math.max(1, Math.ceil(measureCtx.measureText(text).width))
    const height = Math.ceil(size * 1.3)

    const scale = 2 // render at 2× for crisp print output
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.scale(scale, scale)
    ctx.font = font
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(text, 0, height / 2)

    return { dataUrl: canvas.toDataURL('image/png'), width, height }
  } catch (_) {
    return null
  }
}

// Build a pdfmake image node for an emoji string, scaled to a target line
// height (in points) while preserving aspect ratio.
function emojiImageNode(emojiString, targetHeight = 15) {
  const rendered = renderEmojiImage(emojiString)
  if (!rendered) return null
  const displayWidth = (rendered.width / rendered.height) * targetHeight
  return { image: rendered.dataUrl, width: displayWidth }
}

const EMOJI_RE = /\p{Extended_Pictographic}/u

function containsEmoji(value) {
  return EMOJI_RE.test(String(value || ''))
}

// pdfmake has no inline images, so a message that mixes text and emojis (e.g.
// "Great job 🎉 keep it up 😀") cannot be laid out with the Roboto font alone.
// Render the whole wrapped paragraph to a canvas using a font chain that falls
// back to the platform colour-emoji font, then embed it sized to display at the
// exact target width and point size — so it flows like the rest of the book.
function renderRichTextImage(text, { widthPt, fontSizePt = 10.5, lineHeight = 1.45, color = '#3C2415' }) {
  try {
    if (typeof document === 'undefined') return null
    const source = String(text || '')
    if (!source) return null

    const scale = 3 // render at 3× so text stays sharp in print
    const fontPx = fontSizePt * scale
    const widthPx = Math.max(1, Math.floor(widthPt * scale))
    const lineHeightPx = fontPx * lineHeight
    const font = `${fontPx}px "Segoe UI","Helvetica Neue",system-ui,"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",Arial,sans-serif`

    const measureCtx = document.createElement('canvas').getContext('2d')
    if (!measureCtx) return null
    measureCtx.font = font

    const lines = []
    source.split('\n').forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean)
      if (!words.length) {
        lines.push('')
        return
      }
      let current = ''
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word
        if (measureCtx.measureText(candidate).width <= widthPx) {
          current = candidate
          continue
        }
        if (current) lines.push(current)
        if (measureCtx.measureText(word).width > widthPx) {
          // Word (or long emoji run) wider than the column — break by grapheme.
          let chunk = ''
          for (const grapheme of splitEmojiTokens(word)) {
            if (chunk && measureCtx.measureText(chunk + grapheme).width > widthPx) {
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

    const canvas = document.createElement('canvas')
    canvas.width = widthPx
    canvas.height = Math.max(1, Math.ceil(lines.length * lineHeightPx))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.font = font
    ctx.textBaseline = 'top'
    ctx.fillStyle = color
    const topPad = (lineHeightPx - fontPx) / 2
    lines.forEach((line, i) => ctx.fillText(line, 0, i * lineHeightPx + topPad))

    return { image: canvas.toDataURL('image/png'), width: widthPt }
  } catch (_) {
    return null
  }
}

function addSectionWithPageBreak(sectionBlocks, section) {
  if (!section.length) return
  sectionBlocks.push(section)
}

function buildCoverPage() {
  return [
    {
      canvas: [
        // Full-page burgundy background. Oversized so it bleeds past the trim
        // edge on both standard A4 (595×842pt) and Pixum bleed pages (612×859pt).
        { type: 'rect', x: -60, y: -60, w: 740, h: 1000, color: '#5A252C' }
      ],
      absolutePosition: { x: 0, y: 0 }
    },
    // Gold top ornament rule
    {
      canvas: [
        { type: 'line', x1: 140, y1: 0, x2: 375, y2: 0, lineWidth: 1.5, lineColor: '#C9A84C' }
      ],
      margin: [0, 160, 0, 30]
    },
    {
      text: 'Celebrating',
      alignment: 'center',
      fontSize: 14,
      color: '#E8D48B',
      characterSpacing: 3,
      margin: [0, 0, 0, 6]
    },
    {
      text: "Jeannette's",
      alignment: 'center',
      fontSize: 42,
      bold: true,
      color: '#FDF6E3',
      margin: [0, 0, 0, 4]
    },
    {
      text: '25 Wonderful Years',
      alignment: 'center',
      fontSize: 22,
      bold: true,
      color: '#C9A84C',
      margin: [0, 0, 0, 10]
    },
    {
      text: 'at Salling Group',
      alignment: 'center',
      fontSize: 14,
      color: '#C8B09A',
      margin: [0, 0, 0, 30]
    },
    {
      canvas: [
        { type: 'line', x1: 140, y1: 0, x2: 375, y2: 0, lineWidth: 1.5, lineColor: '#C9A84C' }
      ],
      margin: [0, 0, 0, 30]
    },
    {
      text: 'A collection of warm wishes, memories\nand celebrations from colleagues & friends',
      alignment: 'center',
      fontSize: 11,
      italics: true,
      color: '#C8B09A',
      lineHeight: 1.6
    },
    {
      text: new Date().toLocaleDateString('da-DK', { year: 'numeric', month: 'long' }),
      alignment: 'center',
      fontSize: 9,
      color: '#9B8A7C',
      margin: [0, 40, 0, 0]
    }
  ]
}

function buildSpeechPage(speech) {
  if (!speech?.body) return []

  return [
    { text: '', margin: [0, 40, 0, 0] },
    {
      text: speech.title || 'A Few Words',
      alignment: 'center',
      fontSize: 22,
      bold: true,
      color: '#722F37',
      margin: [0, 0, 0, 5]
    },
    {
      text: speech.author ? `— ${speech.author}` : '',
      alignment: 'center',
      fontSize: 12,
      italics: true,
      color: '#9B8A7C',
      margin: [0, 0, 0, 25]
    },
    {
      canvas: [
        { type: 'line', x1: 200, y1: 0, x2: 315, y2: 0, lineWidth: 1, lineColor: '#E8D48B' }
      ],
      margin: [0, 0, 0, 25]
    },
    {
      text: speech.body,
      fontSize: 12,
      lineHeight: 1.8,
      color: '#3C2415',
      margin: [40, 0, 40, 0]
    }
  ]
}

function buildNotesPage(notes) {
  if (!notes?.trim()) return []

  return [
    { text: '', margin: [0, 40, 0, 0] },
    {
      text: 'Personal Notes',
      alignment: 'center',
      fontSize: 22,
      bold: true,
      color: '#722F37',
      margin: [0, 0, 0, 8]
    },
    {
      canvas: [
        { type: 'line', x1: 200, y1: 0, x2: 315, y2: 0, lineWidth: 1, lineColor: '#E8D48B' }
      ],
      margin: [0, 0, 0, 20]
    },
    {
      text: notes.trim(),
      fontSize: 12,
      lineHeight: 1.8,
      color: '#3C2415',
      margin: [40, 0, 40, 0]
    }
  ]
}

// Gold left border + warm cream fill, mirroring the .bp-message-card look in
// the on-screen book preview.
const messageCardLayout = {
  hLineWidth: () => 0,
  vLineWidth: (i) => (i === 0 ? 3 : 0),
  vLineColor: () => '#C9A84C',
  fillColor: () => '#FDF6E3',
  paddingLeft: () => 12,
  paddingRight: () => 10,
  paddingTop: () => 9,
  paddingBottom: () => 9
}

function buildMessageBody(msg, textWidthPt) {
  const body = []
  const message = msg.message || ''

  // Emojis typed inline in the message body can't render with Roboto, so draw
  // the whole paragraph to an image when emojis are present; otherwise keep it
  // as real, selectable text.
  const richText = containsEmoji(message)
    ? renderRichTextImage(message, { widthPt: textWidthPt })
    : null

  if (richText) {
    body.push(richText)
  } else {
    body.push({
      text: message,
      fontSize: 10.5,
      lineHeight: 1.45,
      color: '#3C2415'
    })
  }

  const emoji = emojiImageNode(msg.emojis, 16)
  if (emoji) {
    body.push({ ...emoji, margin: [0, 5, 0, 0] })
  }

  return body
}

function buildMessageEntry(msg, cardContentWidth) {
  // Small photo / video thumbnail tucked to the right, like the floated thumb
  // in the preview card.
  const thumb = msg.photoDataUrl
    ? msg.photoDataUrl
    : (msg.videoThumbnailDataUrl || null)

  // Width available to the message text/emoji image, accounting for card
  // padding and the thumbnail column when present.
  const thumbColumn = 64 + 10 // thumb width + column gap
  const textWidthPt = Math.max(80, (thumb ? cardContentWidth - thumbColumn : cardContentWidth) - 2)
  const body = buildMessageBody(msg, textWidthPt)

  let topRow
  if (thumb) {
    topRow = {
      columns: [
        { width: '*', stack: body },
        {
          width: 64,
          stack: [
            { image: thumb, fit: [64, 64], alignment: 'right' },
            msg.videoThumbnailDataUrl && !msg.photoDataUrl
              ? { text: `▶ ${formatVideoDuration(msg.videoDuration)}`, fontSize: 7, color: '#9B8A7C', alignment: 'center', margin: [0, 2, 0, 0] }
              : null
          ].filter(Boolean)
        }
      ],
      columnGap: 10
    }
  } else {
    topRow = { stack: body }
  }

  const cardStack = [
    topRow,
    {
      text: `— ${msg.name || 'Anonymous'}`,
      fontSize: 11,
      italics: true,
      color: '#9C7A22',
      alignment: 'right',
      margin: [0, 6, 0, 0]
    }
  ]

  return {
    // dontBreakRows keeps a whole message card together: if it doesn't fit in
    // the remaining space it moves to the next page instead of being split
    // across the page break.
    table: { widths: ['*'], dontBreakRows: true, body: [[{ stack: cardStack }]] },
    layout: messageCardLayout,
    margin: [0, 0, 0, 9]
  }
}

function buildMessagesSection(messages, cardContentWidth) {
  if (!messages?.length) return []

  const content = [
    {
      text: 'MESSAGES',
      alignment: 'center',
      fontSize: 8,
      bold: true,
      characterSpacing: 2,
      color: '#9C7A22',
      margin: [0, 30, 0, 3]
    },
    {
      text: 'Messages from Colleagues',
      alignment: 'center',
      fontSize: 22,
      bold: true,
      color: '#722F37',
      margin: [0, 0, 0, 6]
    },
    {
      canvas: [
        { type: 'line', x1: 150, y1: 0, x2: 365, y2: 0, lineWidth: 1, lineColor: '#E8D48B' }
      ],
      margin: [0, 0, 0, 22]
    }
  ]

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  sorted.forEach((msg) => content.push(buildMessageEntry(msg, cardContentWidth)))

  return content
}

function buildBoothSection(photos) {
  if (!photos?.length) return []

  const content = [
    {
      text: 'Photo Booth Memories',
      alignment: 'center',
      fontSize: 22,
      bold: true,
      color: '#722F37',
      margin: [0, 30, 0, 5]
    },
    {
      canvas: [
        { type: 'line', x1: 170, y1: 0, x2: 345, y2: 0, lineWidth: 1, lineColor: '#E8D48B' }
      ],
      margin: [0, 0, 0, 25]
    }
  ]

  // Two photos per row for regular photos, single column for strips
  const regular = photos.filter(p => !p?.isStrip && p?.photoDataUrl)
  const strips  = photos.filter(p =>  p?.isStrip && p?.photoDataUrl)

  // Pair regular photos into rows of 2
  for (let i = 0; i < regular.length; i += 2) {
    const pair = regular.slice(i, i + 2)
    const cells = pair.map(photo => ({
      stack: [
        {
          // Gold-bordered mat table
          table: {
            widths: ['*'],
            body: [[
              {
                image: photo.photoDataUrl,
                fit: [200, 150],
                alignment: 'center',
                margin: [4, 4, 4, 4],
                border: [true, true, true, true]
              }
            ]]
          },
          layout: {
            hLineColor: () => '#C9A84C',
            vLineColor: () => '#C9A84C',
            hLineWidth: () => 1.5,
            vLineWidth: () => 1.5,
            fillColor: () => '#FFFDF8'
          }
        },
        {
          text: photo.caption || 'Photo Booth Memory',
          fontSize: 8,
          color: '#9B8A7C',
          alignment: 'center',
          margin: [0, 4, 0, 0]
        }
      ],
      margin: [0, 0, 0, 12]
    }))
    // Pad to 2 columns
    while (cells.length < 2) cells.push({ text: '' })
    content.push({ columns: cells, columnGap: 12 })
  }

  // Strips go full-width
  strips.forEach(photo => {
    content.push({
      stack: [
        {
          table: {
            widths: ['*'],
            body: [[
              {
                image: photo.photoDataUrl,
                fit: [180, 360],
                alignment: 'center',
                margin: [4, 4, 4, 4],
                border: [true, true, true, true]
              }
            ]]
          },
          layout: {
            hLineColor: () => '#C9A84C',
            vLineColor: () => '#C9A84C',
            hLineWidth: () => 1.5,
            vLineWidth: () => 1.5,
            fillColor: () => '#FFFDF8'
          },
          alignment: 'center'
        },
        {
          text: 'Photo Strip',
          fontSize: 8,
          color: '#9B8A7C',
          alignment: 'center',
          margin: [0, 4, 0, 12]
        }
      ]
    })
  })

  return content
}

function buildVideoSection(videos) {
  if (!videos?.length) return []

  const content = [
    {
      text: 'Saved Videos',
      alignment: 'center',
      fontSize: 22,
      bold: true,
      color: '#722F37',
      margin: [0, 30, 0, 5]
    },
    {
      canvas: [
        { type: 'line', x1: 170, y1: 0, x2: 345, y2: 0, lineWidth: 1, lineColor: '#E8D48B' }
      ],
      margin: [0, 0, 0, 25]
    }
  ]

  videos.forEach((video) => {
    if (!video?.videoThumbnailDataUrl) return

    content.push({
      stack: [
        {
          image: video.videoThumbnailDataUrl,
          fit: [420, 250],
          alignment: 'center',
          margin: [0, 0, 0, 6]
        },
        {
          text: `${video.source === 'booth' ? 'Booth video' : 'Video message'} · ${formatVideoDuration(video.videoDuration)}`,
          fontSize: 9,
          color: '#9B8A7C',
          alignment: 'center',
          margin: [0, 0, 0, 14]
        }
      ],
      margin: [0, 0, 0, 8]
    })
  })

  return content
}

function buildBackCover() {
  return [
    { text: '', margin: [0, 200, 0, 0] },
    {
      text: 'Thank you for 25 wonderful years!',
      alignment: 'center',
      fontSize: 20,
      bold: true,
      color: '#722F37',
      margin: [0, 0, 0, 15]
    },
    {
      text: 'Jeannette, you are truly valued.',
      alignment: 'center',
      fontSize: 14,
      italics: true,
      color: '#9B8A7C',
      margin: [0, 0, 0, 20]
    },
    {
      canvas: [
        { type: 'line', x1: 200, y1: 0, x2: 315, y2: 0, lineWidth: 2, lineColor: '#C9A84C' }
      ],
      margin: [0, 0, 0, 20]
    },
    {
      text: 'Salling Group · ' + new Date().getFullYear(),
      alignment: 'center',
      fontSize: 10,
      color: '#9B8A7C'
    }
  ]
}

export function estimateGuestbookPages({ messages = [], boothPhotos = [], boothVideos = [], speech, notes = '', includeSections = {} }) {
  let total = 0

  if (includeSections.cover !== false) total += 1
  if (includeSections.speech && speech?.body) total += 1
  if (includeSections.messages && messages.length) total += Math.ceil(messages.length / 6)
  if (includeSections.photos && boothPhotos.length) {
    const stripCount = boothPhotos.filter(photo => photo?.isStrip).length
    const regularCount = boothPhotos.length - stripCount
    total += stripCount + Math.ceil(regularCount / 2)
  }
  if (includeSections.videos && boothVideos.length) total += Math.ceil(boothVideos.length / 2)
  if (includeSections.notes && notes.trim()) total += 1
  if (includeSections.backCover !== false) total += 1

  return Math.max(total, 1)
}

// Millimetre → PDF point (72dpi) conversion for print-format page sizing.
const MM_TO_PT = 72 / 25.4

async function loadPdfMake() {
  const [pdfMakeModule, pdfFontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts')
  ])

  const pdfMake = pdfMakeModule.default || pdfMakeModule

  // pdfmake 0.2.x ships vfs_fonts as `module.exports = vfs`, so under Vite/ESM
  // interop the font table is the module's default export — not `.pdfMake.vfs`
  // (the shape older releases used). Resolve the default first, then fall back
  // through the legacy shapes, so the embedded Roboto fonts are always found.
  // Without this createPdf() throws and no file is produced.
  if (!pdfMake.vfs) {
    const fonts = pdfFontsModule.default || pdfFontsModule
    pdfMake.vfs = fonts.vfs || fonts.pdfMake?.vfs || fonts
  }

  return pdfMake
}

// Message-card content width = page content width minus the card's horizontal
// padding (12 + 10pt). Used to size canvas-rendered emoji/text images so they
// flow at the correct width for the chosen page format.
const CARD_PADDING_X = 22

function buildSectionBlocks({ messages, boothPhotos, boothVideos, speech, notes, includeSections, contentWidth = 495.28 }) {
  const sectionBlocks = []
  const cardContentWidth = contentWidth - CARD_PADDING_X

  if (includeSections.cover !== false) {
    addSectionWithPageBreak(sectionBlocks, buildCoverPage())
  }
  if (includeSections.messages) {
    addSectionWithPageBreak(sectionBlocks, buildMessagesSection(messages, cardContentWidth))
  }
  if (includeSections.photos) {
    addSectionWithPageBreak(sectionBlocks, buildBoothSection(boothPhotos))
  }
  if (includeSections.videos) {
    addSectionWithPageBreak(sectionBlocks, buildVideoSection(boothVideos))
  }
  if (includeSections.notes) {
    addSectionWithPageBreak(sectionBlocks, buildNotesPage(notes))
  }
  // The speech closes the book, on the last pages before the back cover.
  if (includeSections.speech) {
    addSectionWithPageBreak(sectionBlocks, buildSpeechPage(speech))
  }
  if (includeSections.backCover !== false) {
    addSectionWithPageBreak(sectionBlocks, buildBackCover())
  }

  return sectionBlocks.flatMap((section, index) => {
    if (index === sectionBlocks.length - 1) return section
    return [...section, { text: '', pageBreak: 'after' }]
  })
}

export async function generateGuestbookPDF({ messages = [], boothPhotos = [], boothVideos = [], speech, notes = '', includeSections = {} }) {
  const pdfMake = await loadPdfMake()
  // A4 width (595.28pt) minus the 50pt left/right page margins.
  const content = buildSectionBlocks({ messages, boothPhotos, boothVideos, speech, notes, includeSections, contentWidth: 595.28 - 100 })

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [50, 55, 50, 55],
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: "Jeannette's 25th Anniversary", fontSize: 8, color: '#C9A84C', margin: [40, 0, 0, 0] },
        { text: `${currentPage} / ${pageCount}`, alignment: 'right', fontSize: 8, color: '#9B8A7C', margin: [0, 0, 40, 0] }
      ],
      margin: [0, 10, 0, 0]
    }),
    defaultStyle: {
      font: 'Roboto'
    }
  }

  pdfMake.createPdf(docDefinition).download('Jeannettes-25th-Anniversary-Guestbook.pdf')
}

// A4 portrait photo book with 3mm bleed on every edge, sized for print-on-demand
// services such as Pixum. Trim size is 210×297mm; with 3mm bleed each side the
// page becomes 216×303mm. Content sits inside a safety margin so nothing
// important is lost when the book is trimmed and bound.
export async function generatePixumPrintPDF({ messages = [], boothPhotos = [], boothVideos = [], speech, notes = '', includeSections = {} }) {
  const pdfMake = await loadPdfMake()

  const bleed = 3 * MM_TO_PT
  const pageWidth = (210 + 6) * MM_TO_PT   // 216mm
  const pageHeight = (297 + 6) * MM_TO_PT  // 303mm
  // ~10mm safe margin from the trimmed edge (bleed + 7mm safety); a little extra
  // on the inside edge for the binding.
  const safe = 10 * MM_TO_PT
  const innerMargin = 13 * MM_TO_PT

  const content = buildSectionBlocks({
    messages, boothPhotos, boothVideos, speech, notes, includeSections,
    contentWidth: pageWidth - innerMargin - safe
  })

  const docDefinition = {
    pageSize: { width: pageWidth, height: pageHeight },
    pageMargins: [innerMargin, safe, safe, safe],
    // Warm paper fills the whole page edge-to-edge so trimming never exposes a
    // white sliver on full-bleed interior pages.
    background: () => ({
      canvas: [
        { type: 'rect', x: 0, y: 0, w: pageWidth, h: pageHeight, color: '#FFFDF8' }
      ]
    }),
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: "Jeannette's 25th Anniversary", fontSize: 8, color: '#C9A84C', margin: [innerMargin, 0, 0, 0] },
        { text: `${currentPage} / ${pageCount}`, alignment: 'right', fontSize: 8, color: '#9B8A7C', margin: [0, 0, safe, 0] }
      ],
      margin: [0, bleed, 0, 0]
    }),
    defaultStyle: {
      font: 'Roboto'
    }
  }

  pdfMake.createPdf(docDefinition).download('Jeannettes-Guestbook-Pixum-Print.pdf')
}
