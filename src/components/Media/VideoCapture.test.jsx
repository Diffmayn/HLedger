import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VideoCapture from './VideoCapture'

const mocks = vi.hoisted(() => ({
  hookState: null,
  startPreview: vi.fn(),
  stopPreview: vi.fn(),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  createVideoMetadata: vi.fn(),
  onCapture: vi.fn(),
  onClose: vi.fn()
}))

vi.mock('../../hooks/useMediaRecorder', () => ({
  default: () => mocks.hookState
}))

vi.mock('../../utils/videoUtils', async () => {
  const actual = await vi.importActual('../../utils/videoUtils')
  return {
    ...actual,
    createVideoMetadata: mocks.createVideoMetadata
  }
})

describe('VideoCapture', () => {
  beforeEach(() => {
    mocks.startPreview.mockReset()
    mocks.stopPreview.mockReset()
    mocks.startRecording.mockReset()
    mocks.stopRecording.mockReset()
    mocks.createVideoMetadata.mockReset()
    mocks.onCapture.mockReset()
    mocks.onClose.mockReset()

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:captured-video')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts preview on mount and starts recording when requested', async () => {
    mocks.hookState = {
      previewRef: { current: null },
      isReady: true,
      isRecording: false,
      durationMs: 0,
      error: '',
      startPreview: mocks.startPreview,
      stopPreview: mocks.stopPreview,
      startRecording: mocks.startRecording,
      stopRecording: mocks.stopRecording
    }

    const user = userEvent.setup()
    render(<VideoCapture onCapture={mocks.onCapture} onClose={mocks.onClose} />)

    expect(mocks.startPreview).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: /start recording/i }))

    expect(mocks.startRecording).toHaveBeenCalledOnce()
  })

  it('builds metadata after stopping and forwards the captured video', async () => {
    const blob = new Blob(['video'], { type: 'video/webm' })
    mocks.stopRecording.mockResolvedValue({ blob, durationMs: 1500, mimeType: 'video/webm' })
    mocks.createVideoMetadata.mockResolvedValue({
      videoBlob: blob,
      videoMimeType: 'video/webm',
      videoDuration: 1200,
      videoThumbnailDataUrl: 'data:image/jpeg;base64,AAAA'
    })
    mocks.hookState = {
      previewRef: { current: null },
      isReady: true,
      isRecording: true,
      durationMs: 500,
      error: '',
      startPreview: mocks.startPreview,
      stopPreview: mocks.stopPreview,
      startRecording: mocks.startRecording,
      stopRecording: mocks.stopRecording
    }

    const user = userEvent.setup()
    render(<VideoCapture onCapture={mocks.onCapture} onClose={mocks.onClose} />)

    await user.click(screen.getByRole('button', { name: /stop recording/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /use this video/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /use this video/i }))

    expect(mocks.createVideoMetadata).toHaveBeenCalledWith(blob)
    expect(mocks.stopPreview).toHaveBeenCalled()
    expect(mocks.onCapture).toHaveBeenCalledWith({
      videoBlob: blob,
      videoMimeType: 'video/webm',
      videoDuration: 1500,
      videoThumbnailDataUrl: 'data:image/jpeg;base64,AAAA'
    })
  })
})