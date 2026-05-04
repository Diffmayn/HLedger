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
    { text: '', margin: [0, 120, 0, 0] },
    {
      text: 'Celebrating',
      alignment: 'center',
      fontSize: 18,
      color: '#9B4D56',
      margin: [0, 0, 0, 5]
    },
    {
      text: "Jeannette's",
      alignment: 'center',
      fontSize: 38,
      bold: true,
      color: '#722F37',
      margin: [0, 0, 0, 5]
    },
    {
      text: '25 Years',
      alignment: 'center',
      fontSize: 32,
      bold: true,
      color: '#C9A84C',
      margin: [0, 0, 0, 10]
    },
    {
      text: 'at Salling Group',
      alignment: 'center',
      fontSize: 20,
      color: '#6B5244',
      margin: [0, 0, 0, 30]
    },
    {
      canvas: [
        { type: 'line', x1: 170, y1: 0, x2: 345, y2: 0, lineWidth: 2, lineColor: '#C9A84C' }
      ],
      margin: [0, 0, 0, 30]
    },
    {
      text: 'A collection of warm wishes, memories\nand celebrations from colleagues & friends',
      alignment: 'center',
      fontSize: 12,
      italics: true,
      color: '#9B8A7C'
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

  photos.forEach((photo) => {
    if (!photo?.photoDataUrl) return

    content.push({
      stack: [
        {
          image: photo.photoDataUrl,
          fit: photo.isStrip ? [180, 380] : [420, 250],
          alignment: 'center',
          margin: [0, 0, 0, 6]
        },
        {
          text: photo.isStrip ? 'Photo Strip' : (photo.caption || 'Photo Booth Memory'),
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
    pageMargins: [40, 40, 40, 50],
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
