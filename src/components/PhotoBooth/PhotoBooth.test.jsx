import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PhotoBooth from './PhotoBooth'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  startCamera: vi.fn(),
  stopCamera: vi.fn(),
  captureFrame: vi.fn(),
  startTracking: vi.fn(),
  stopTracking: vi.fn(),
  addBoothPhoto: vi.fn(),
  addBoothVideo: vi.fn(),
  broadcast: vi.fn(),
  webcamState: null,
  trackingState: null,
  composePhotoStrip: vi.fn()
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate
}))

vi.mock('../../hooks/useWebcam', () => ({
  default: () => mocks.webcamState
}))

vi.mock('../../hooks/useFaceTracking', () => ({
  default: () => mocks.trackingState
}))

vi.mock('../../hooks/useBroadcastChannel', () => ({
  default: () => ({ broadcast: mocks.broadcast })
}))

vi.mock('../../hooks/useDatabase', () => ({
  useBoothPhotos: () => ({ addBoothPhoto: mocks.addBoothPhoto }),
  useBoothVideos: () => ({ addBoothVideo: mocks.addBoothVideo })
}))

vi.mock('../FaceFilter/FilterOverlay', () => ({
  default: () => <div data-testid="filter-overlay" />
}))

vi.mock('../FaceFilter/FilterSelector', () => ({
  default: () => <div data-testid="filter-selector" />
}))

vi.mock('./PhotoStrip', () => ({
  default: ({ frames }) => <div data-testid="photo-strip">{frames.length} frames</div>
}))

vi.mock('../Media/VideoCapture', () => ({
  default: () => <div data-testid="video-capture" />
}))

vi.mock('../../utils/imageUtils', async () => {
  const actual = await vi.importActual('../../utils/imageUtils')
  return {
    ...actual,
    composePhotoStrip: mocks.composePhotoStrip
  }
})

describe('PhotoBooth', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.startCamera.mockReset()
    mocks.stopCamera.mockReset()
    mocks.captureFrame.mockReset()
    mocks.startTracking.mockReset()
    mocks.stopTracking.mockReset()
    mocks.addBoothPhoto.mockReset()
    mocks.addBoothVideo.mockReset()
    mocks.broadcast.mockReset()
    mocks.composePhotoStrip.mockReset()

    mocks.webcamState = {
      videoRef: { current: null },
      isReady: true,
      error: '',
      startCamera: mocks.startCamera,
      stopCamera: mocks.stopCamera,
      captureFrame: mocks.captureFrame
    }
    mocks.trackingState = {
      landmarks: [],
      isTracking: false,
      isLoading: false,
      trackingError: '',
      faceCount: 0,
      start: mocks.startTracking,
      stop: mocks.stopTracking
    }
  })

  it('renders the camera error state when the webcam is unavailable', () => {
    mocks.webcamState = {
      ...mocks.webcamState,
      error: 'Camera access denied'
    }

    render(<PhotoBooth />)

    expect(screen.getByText(/camera not available/i)).toBeInTheDocument()
    expect(screen.getByText('Camera access denied')).toBeInTheDocument()
  })

  it('captures a single shot and saves it to the gallery', async () => {
    mocks.captureFrame.mockReturnValue('data:image/png;base64,AAAA')
    mocks.addBoothPhoto.mockResolvedValue('photo-1')

    const user = userEvent.setup()
    render(<PhotoBooth />)

    expect(mocks.startCamera).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: /single shot/i }))
    expect(screen.getByTestId('photo-strip')).toHaveTextContent('1 frames')

    await user.click(screen.getByRole('button', { name: /save to gallery/i }))

    await waitFor(() => {
      expect(mocks.addBoothPhoto).toHaveBeenCalledWith({
        photoDataUrl: 'data:image/png;base64,AAAA',
        caption: '',
        filtersUsed: [],
        isStrip: false
      })
    })

    expect(mocks.broadcast).toHaveBeenCalledWith('NEW_BOOTH_PHOTO', {
      id: 'photo-1',
      photoDataUrl: 'data:image/png;base64,AAAA',
      timestamp: expect.any(Number)
    })
    expect(mocks.navigate).toHaveBeenCalledWith('/')
  })
})