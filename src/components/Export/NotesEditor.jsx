import { useEffect, useState } from 'react'
import { useSettings } from '../../hooks/useDatabase'
import './SpeechEditor.css'

export default function NotesEditor() {
  const { getSetting, setSetting } = useSettings()
  const storedNotes = getSetting('ebookNotes') || ''
  const [notes, setNotes] = useState(storedNotes)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setNotes(storedNotes || '')
  }, [storedNotes])

  const handleSave = async () => {
    await setSetting('ebookNotes', notes.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="speech-editor">
      <div className="speech-editor-header">
        <h3>📝 Personal Notes</h3>
        <p>Add one final notes page to the ebook preview and PDF.</p>
      </div>

      <div className="speech-form">
        <div className="speech-group">
          <label htmlFor="ebook-notes">Notes for the last page</label>
          <textarea
            id="ebook-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write a personal note, dedication, or closing message here..."
            rows={8}
            maxLength={2500}
          />
          <span className="speech-count">{notes.length}/2500</span>
        </div>

        <button onClick={handleSave} className="speech-save-btn" disabled={!notes.trim()}>
          {saved ? '✓ Saved!' : '💾 Save Notes Page'}
        </button>
      </div>
    </div>
  )
}
