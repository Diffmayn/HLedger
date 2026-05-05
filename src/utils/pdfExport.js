import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFonts from 'pdfmake/build/vfs_fonts'
import { formatVideoDuration } from './videoUtils'

if (pdfMake.vfs === undefined) {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.default?.pdfMake?.vfs || pdfFonts.vfs
}

function addSectionWithPageBreak(sectionBlocks, section) {
  if (!section.length) return
  sectionBlocks.push(section)
}

function buildCoverPage() {
  return [
    {
      canvas: [
        // Full-page burgundy background
        { type: 'rect', x: -40, y: -40, w: 595, h: 842, color: '#5A252C' }
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
      letterSpacing: 3,
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

function buildMessageEntry(msg) {
  const items = []

  if (msg.photoDataUrl) {
    try {
      items.push({
        image: msg.photoDataUrl,
        width: 180,
        alignment: 'center',
        margin: [0, 0, 0, 8]
      })
    } catch (_) {
      // Skip corrupted images in export while preserving the rest of the book.
    }
  } else if (msg.videoThumbnailDataUrl) {
    items.push({
      image: msg.videoThumbnailDataUrl,
      width: 180,
      alignment: 'center',
      margin: [0, 0, 0, 8]
    })
    items.push({
      text: `Video message · ${formatVideoDuration(msg.videoDuration)}`,
      fontSize: 9,
      color: '#9B8A7C',
      alignment: 'center',
      margin: [0, 0, 0, 8]
    })
  }

  items.push({
    text: msg.name || 'Anonymous',
    fontSize: 14,
    bold: true,
    color: '#722F37',
    margin: [0, 0, 0, 3]
  })
  items.push({
    text: msg.message || '',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#3C2415',
    margin: [0, 0, 0, 3]
  })

  if (msg.emojis) {
    items.push({
      text: msg.emojis,
      fontSize: 16,
      margin: [0, 0, 0, 3]
    })
  }

  items.push({
    text: new Date(msg.timestamp).toLocaleDateString('da-DK', {
      day: 'numeric', month: 'long', year: 'numeric'
    }),
    fontSize: 9,
    color: '#9B8A7C',
    italics: true
  })

  return {
    stack: items,
    margin: [0, 0, 0, 20]
  }
}

function buildMessagesSection(messages) {
  if (!messages?.length) return []

  const content = [
    {
      text: 'Messages from the Heart',
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

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  const left = []
  const right = []

  sorted.forEach((msg, index) => {
    if (index % 2 === 0) left.push(buildMessageEntry(msg))
    else right.push(buildMessageEntry(msg))
  })

  content.push({
    columns: [
      { stack: left, width: '48%' },
      { width: '4%', text: '' },
      { stack: right, width: '48%' }
    ],
    columnGap: 10
  })

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
  if (includeSections.messages && messages.length) total += Math.ceil(messages.length / 8)
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

export function generateGuestbookPDF({ messages = [], boothPhotos = [], boothVideos = [], speech, notes = '', includeSections = {} }) {
  const sectionBlocks = []

  if (includeSections.cover !== false) {
    addSectionWithPageBreak(sectionBlocks, buildCoverPage())
  }
  if (includeSections.speech) {
    addSectionWithPageBreak(sectionBlocks, buildSpeechPage(speech))
  }
  if (includeSections.messages) {
    addSectionWithPageBreak(sectionBlocks, buildMessagesSection(messages))
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
  if (includeSections.backCover !== false) {
    addSectionWithPageBreak(sectionBlocks, buildBackCover())
  }

  const content = sectionBlocks.flatMap((section, index) => {
    if (index === sectionBlocks.length - 1) return section
    return [...section, { text: '', pageBreak: 'after' }]
  })

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
