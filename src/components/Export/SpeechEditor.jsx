import { useEffect, useState } from 'react'
import { useSpeech } from '../../hooks/useDatabase'
import './SpeechEditor.css'

export default function SpeechEditor() {
  const { speech, saveSpeech } = useSpeech()
  const [title, setTitle] = useState(speech?.title ?? 'A Few Words from the Boss')
  const [body, setBody] = useState(speech?.body ?? '')
  const [author, setAuthor] = useState(speech?.author ?? '')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (speech) {
      setTitle(speech.title || 'A Few Words from the Boss')
      setBody(speech.body || '')
      setAuthor(speech.author || '')
    }
  }, [speech])

  const handleSave = async () => {
    await saveSpeech({ title: title.trim(), body: body.trim(), author: author.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="speech-editor">
      <div className="speech-editor-header">
        <h3>✍️ Boss's Speech</h3>
        <p>Add a special message to include in the guestbook:</p>
      </div>

      <div className="speech-form">
        <div className="speech-group">
          <label htmlFor="speech-title">Title</label>
          <input
            id="speech-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Section title"
            maxLength={100}
          />
        </div>

        <div className="speech-group">
          <label htmlFor="speech-body">Speech Text</label>
          <textarea
            id="speech-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the boss's speech or message here..."
            rows={8}
            maxLength={3000}
          />
          <span className="speech-count">{body.length}/3000</span>
        </div>

        <div className="speech-group">
          <label htmlFor="speech-author">Author Name</label>
          <input
            id="speech-author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="e.g., Lars Jensen, CEO"
            maxLength={80}
          />
        </div>

        <button onClick={handleSave} className="speech-save-btn" disabled={!body.trim()}>
          {saved ? '✓ Saved!' : '💾 Save Speech'}
        </button>
      </div>
    </div>
  )
}
