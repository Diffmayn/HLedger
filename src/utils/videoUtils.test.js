import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVideoMetadata, formatVideoDuration, getSupportedRecordingMimeType } from './videoUtils'

describe('formatVideoDuration', () => {
  it('formats milliseconds as m:ss', () => {
    expect(formatVideoDuration(0)).toBe('0:00')
    expect(formatVideoDuration(61500)).toBe('1:02')
  })
})

describe('getSupportedRecordingMimeType', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns an empty string when MediaRecorder is unavailable', () => {
    vi.stubGlobal('MediaRecorder', undefined)
    expect(getSupportedRecordingMimeType()).toBe('')
  })

  it('returns the first supported mime type', () => {
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: vi.fn((type) => type === 'video/webm')
    })

    expect(getSupportedRecordingMimeType()).toBe('video/webm')
  })
})

describe('createVideoMetadata', () => {
  const originalCreateElement = document.createElement.bind(document)

  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-video')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    document.createElement = originalCreateElement
    vi.restoreAllMocks()
  })

  it('rejects invalid input before touching DOM APIs', async () => {
    await expect(createVideoMetadata(new Blob(['text'], { type: 'text/plain' }))).rejects.toThrow(
      'Please provide a valid video file.'
    )
  })

  it('extracts metadata and generates a thumbnail', async () => {
    const drawImage = vi.fn()
    const video = {
      readyState: 0,
      duration: 2.5,
      videoWidth: 640,
      videoHeight: 360,
      preload: '',
      muted: false,
      playsInline: false,
      src: '',
      set onloadedmetadata(handler) {
        this._onloadedmetadata = handler
        queueMicrotask(() => handler())
      },
      set onloadeddata(handler) {
        this._onloadeddata = handler
        this.readyState = 2
        queueMicrotask(() => handler())
      },
      set onerror(handler) {
        this._onerror = handler
      }
    }

    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,thumb')
    }

    document.createElement = vi.fn((tagName) => {
      if (tagName === 'video') return video
      if (tagName === 'canvas') return canvas
      return originalCreateElement(tagName)
    })

    const sourceBlob = new Blob(['video'], { type: 'video/webm' })
    const metadata = await createVideoMetadata(sourceBlob)

    expect(metadata).toEqual({
      videoBlob: sourceBlob,
      videoMimeType: 'video/webm',
      videoDuration: 2500,
      videoThumbnailDataUrl: 'data:image/jpeg;base64,thumb'
    })
    expect(drawImage).toHaveBeenCalledOnce()
    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(360)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-video')
  })
})