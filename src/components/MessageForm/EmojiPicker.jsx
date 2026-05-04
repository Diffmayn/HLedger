import { useRef, useEffect, useState } from 'react'
import 'emoji-picker-element'
import './EmojiPicker.css'

export default function EmojiPicker({ onSelect }) {
  const wrapperRef = useRef(null)
  const pickerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const picker = pickerRef.current
    if (!picker) return

    const handleEmoji = (event) => {
      onSelect(event.detail.unicode)
    }

    picker.addEventListener('emoji-click', handleEmoji)
    return () => picker.removeEventListener('emoji-click', handleEmoji)
  }, [onSelect, isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      const wrapper = wrapperRef.current
      if (!wrapper) return

      const path = typeof event.composedPath === 'function' ? event.composedPath() : []
      if (path.includes(wrapper)) return

      setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  return (
    <div className="emoji-picker-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="emoji-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        😊 {isOpen ? 'Close' : 'Add Emoji'}
      </button>
      {isOpen && (
        <div className="emoji-picker-dropdown">
          <emoji-picker ref={pickerRef} class="light" />
        </div>
      )}
    </div>
  )
}
