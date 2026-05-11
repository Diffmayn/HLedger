import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddMessageModal from './AddMessageModal'

const { confetti } = vi.hoisted(() => ({
  confetti: vi.fn()
}))

vi.mock('canvas-confetti', () => ({
  default: confetti
}))

vi.mock('./EmojiPicker', () => ({
  default: function EmojiPickerMock({ onSelect }) {
    return (
      <button type="button" onClick={() => onSelect('🎉')}>
        Add Test Emoji
      </button>
    )
  }
}))

vi.mock('./WebcamCapture', () => ({
  default: function WebcamCaptureMock() {
    return <div>Webcam mock</div>
  }
}))

vi.mock('../Media/VideoCapture', () => ({
  default: function VideoCaptureMock() {
    return <div>Video capture mock</div>
  }
}))

describe('AddMessageModal', () => {
  beforeEach(() => {
    confetti.mockReset()
  })

  it('submits trimmed form data and resets the form on success', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(<AddMessageModal onSubmit={onSubmit} onClose={onClose} />)

    await user.type(screen.getByLabelText(/your name/i), '  Jeannette  ')
    await user.type(screen.getByLabelText(/your message/i), '  Congratulations  ')
    await user.click(screen.getByRole('button', { name: /add test emoji/i }))
    await user.click(screen.getByRole('button', { name: /post to guestbook/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Jeannette',
        message: 'Congratulations',
        emojis: '🎉',
        photoDataUrl: null,
        videoBlob: null,
        videoMimeType: null,
        videoDuration: 0,
        videoThumbnailDataUrl: null
      })
    })

    expect(screen.getByLabelText(/your name/i)).toHaveValue('')
    expect(screen.getByLabelText(/your message/i)).toHaveValue('')
    expect(confetti).toHaveBeenCalledOnce()
  })

  it('shows the submit error when onSubmit fails', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network down'))

    render(<AddMessageModal onSubmit={onSubmit} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText(/your name/i), 'Jeannette')
    await user.type(screen.getByLabelText(/your message/i), 'Congrats')
    await user.click(screen.getByRole('button', { name: /post to guestbook/i }))

    expect(await screen.findByText('Network down')).toBeInTheDocument()
  })

  it('closes when escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<AddMessageModal onSubmit={vi.fn()} onClose={onClose} />)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })
})