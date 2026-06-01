import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture the doc definition handed to createPdf and simulate pdfmake 0.2.x,
// where the font table is exported as the module's default (not `.pdfMake.vfs`).
const createPdf = vi.fn(() => ({ download: vi.fn() }))
const pdfMakeStub = { vfs: undefined, createPdf }
const fakeVfs = { 'Roboto-Regular.ttf': 'AAAA', 'Roboto-Medium.ttf': 'BBBB' }

vi.mock('pdfmake/build/pdfmake', () => ({ default: pdfMakeStub }))
vi.mock('pdfmake/build/vfs_fonts', () => ({ default: fakeVfs }))

import { generateGuestbookPDF, generatePixumPrintPDF } from './pdfExport'

const sampleArgs = {
  messages: [{ id: 1, name: 'Ada', message: 'Congrats!', timestamp: Date.now() }],
  boothPhotos: [],
  boothVideos: [],
  speech: null,
  notes: '',
  includeSections: { cover: true, messages: true, backCover: true }
}

describe('pdfExport font (vfs) resolution', () => {
  beforeEach(() => {
    createPdf.mockClear()
    pdfMakeStub.vfs = undefined
  })

  it('loads the embedded fonts so the standard PDF can be generated', async () => {
    await generateGuestbookPDF(sampleArgs)
    // Without this the default Roboto font is missing and createPdf throws.
    expect(pdfMakeStub.vfs).toBe(fakeVfs)
    expect(pdfMakeStub.vfs['Roboto-Regular.ttf']).toBeDefined()
    expect(createPdf).toHaveBeenCalledTimes(1)
  })

  it('produces an A4 + 3mm bleed page for the Pixum print export', async () => {
    await generatePixumPrintPDF(sampleArgs)
    expect(pdfMakeStub.vfs).toBe(fakeVfs)
    expect(createPdf).toHaveBeenCalledTimes(1)

    const doc = createPdf.mock.calls[0][0]
    const mmToPt = 72 / 25.4
    // 216mm × 303mm (210×297 trim + 3mm bleed all round).
    expect(doc.pageSize.width).toBeCloseTo(216 * mmToPt, 1)
    expect(doc.pageSize.height).toBeCloseTo(303 * mmToPt, 1)
    // Full-page paper background guarantees bleed coverage after trimming.
    expect(typeof doc.background).toBe('function')
  })
})
