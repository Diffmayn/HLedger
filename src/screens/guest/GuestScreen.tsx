import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Camera, Check, ImagePlus, Send, Video, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useEventContext } from '@/screens/shared/useEventContext'
import { useCreateEntry, EntryUploadError } from '@/data/entries'
import { prepareImage, prepareVideo } from '@/lib/media'
import { useT } from '@/i18n'
import { EmojiPicker } from '@/screens/shared/EmojiPicker'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toastStore'

type Step = 'name' | 'message' | 'media' | 'done'

interface MediaDraft {
  kind: 'photo' | 'video'
  file: Blob
  previewUrl: string
  durationMs?: number
}

export default function GuestScreen() {
  const { event } = useEventContext()
  const t = useT()
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [emoji, setEmoji] = useState<string[]>([])
  const [media, setMedia] = useState<MediaDraft | null>(null)
  const [progress, setProgress] = useState(0)
  const [doneMessage, setDoneMessage] = useState('')
  const create = useCreateEntry()
  const fileInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)

  useEffect(
    () => () => {
      if (media) URL.revokeObjectURL(media.previewUrl)
    },
    [media],
  )

  const allowed = event.settings.allowedKinds
  const canMedia = allowed.includes('photo') || allowed.includes('video')

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (media) URL.revokeObjectURL(media.previewUrl)
    if (file.type.startsWith('video/')) {
      if (!allowed.includes('video')) return toast.error('Videos are not enabled for this event.')
      try {
        const v = await prepareVideo(file)
        if (v.durationMs > event.settings.maxVideoSeconds * 1000 + 500) {
          return toast.error(t('guest.tooLong', { max: event.settings.maxVideoSeconds }))
        }
        setMedia({ kind: 'video', file, previewUrl: URL.createObjectURL(file), durationMs: v.durationMs })
      } catch {
        toast.error('Could not read that video.')
      }
      return
    }
    if (!allowed.includes('photo')) return toast.error('Photos are not enabled for this event.')
    setMedia({ kind: 'photo', file, previewUrl: URL.createObjectURL(file) })
  }

  const submit = async () => {
    setProgress(0)
    try {
      let mediaInput: Parameters<typeof create.mutateAsync>[0]['input']['media']
      let thumb: Blob | undefined
      let kind: 'message' | 'photo' | 'video' = 'message'
      if (media?.kind === 'photo') {
        const img = await prepareImage(media.file)
        mediaInput = { blob: img.blob, mime: img.mime, width: img.width, height: img.height }
        thumb = img.thumb
        kind = 'photo'
      } else if (media?.kind === 'video') {
        const v = await prepareVideo(media.file)
        mediaInput = { blob: v.blob, mime: v.mime, width: v.width, height: v.height, durationMs: v.durationMs }
        thumb = v.poster
        kind = 'video'
      }
      const entry = await create.mutateAsync({
        input: { eventId: event.id, kind, authorName: name, body, emojis: emoji.join(''), media: mediaInput, thumb },
        onProgress: setProgress,
      })
      setDoneMessage(entry.status === 'pending' ? t('guest.sentPending') : t('guest.sent'))
      setStep('done')
    } catch (e) {
      if (e instanceof EntryUploadError) {
        if (e.code === 'offline') {
          setDoneMessage(t('guest.sentOffline'))
          setStep('done')
          return
        }
        toast.error(e.code === 'rate_limited' ? t('guest.rateLimited') : e.message)
      } else {
        toast.error((e as Error).message)
      }
    }
  }

  const reset = () => {
    setStep('name')
    setBody('')
    setEmoji([])
    if (media) URL.revokeObjectURL(media.previewUrl)
    setMedia(null)
    setProgress(0)
  }

  const stepIndex = ['name', 'message', 'media'].indexOf(step)

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pt-6 safe-pb">
      <header className="mb-6 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-3">{event.subtitle || t('appName')}</p>
        <h1 className="mt-1 text-3xl leading-tight">{step === 'done' ? event.title : t('guest.heading', { title: event.title })}</h1>
        {step !== 'done' && (
          <ol className="mt-4 flex justify-center gap-2" aria-label="Progress">
            {[0, 1, 2].map((i) => (
              <li key={i} className={cn('h-1.5 w-10 rounded-full bg-line transition-colors', i <= stepIndex && 'bg-accent')} />
            ))}
          </ol>
        )}
      </header>

      {step === 'name' && (
        <form
          className="flex flex-1 flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) setStep('message')
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-2">{t('guest.yourName')}</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={t('guest.namePlaceholder')}
              className="h-14 rounded-2xl border bg-surface px-4 text-lg outline-none focus:border-accent"
              autoComplete="name"
              enterKeyHint="next"
            />
          </label>
          <div className="mt-auto">
            <Button type="submit" size="xl" className="w-full" disabled={!name.trim()}>
              {t('guest.next')}
            </Button>
          </div>
        </form>
      )}

      {step === 'message' && (
        <form
          className="flex flex-1 flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (body.trim()) setStep(canMedia ? 'media' : 'media')
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-2">{t('guest.message')}</span>
            <textarea
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={6}
              placeholder={t('guest.messagePlaceholder')}
              className="rounded-2xl border bg-surface p-4 font-hand text-2xl leading-snug outline-none focus:border-accent"
            />
          </label>
          <details className="rounded-2xl border bg-surface p-3">
            <summary className="cursor-pointer text-sm font-medium text-ink-2">{t('guest.emojiHint')} {emoji.length ? `· ${emoji.join('')}` : ''}</summary>
            <EmojiPicker value={emoji} onChange={setEmoji} className="mt-3" />
          </details>
          <div className="mt-auto flex gap-3">
            <Button type="button" variant="secondary" size="xl" onClick={() => setStep('name')} aria-label={t('guest.back')}>
              <ArrowLeft className="size-5" />
            </Button>
            <Button type="submit" size="xl" className="flex-1" disabled={!body.trim()}>
              {t('guest.next')}
            </Button>
          </div>
        </form>
      )}

      {step === 'media' && (
        <div className="flex flex-1 flex-col gap-4">
          {canMedia && !media && (
            <div className="grid gap-3">
              {allowed.includes('photo') && (
                <Button variant="secondary" size="xl" className="justify-start" onClick={() => photoInput.current?.click()}>
                  <Camera className="size-6" /> {t('guest.takePhoto')}
                </Button>
              )}
              {allowed.includes('video') && (
                <Button variant="secondary" size="xl" className="justify-start" onClick={() => videoInput.current?.click()}>
                  <Video className="size-6" /> {t('guest.recordVideo')}
                </Button>
              )}
              <Button variant="ghost" size="lg" className="justify-start" onClick={() => fileInput.current?.click()}>
                <ImagePlus className="size-6" /> {t('guest.chooseFile')}
              </Button>
              <input ref={photoInput} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
              <input ref={videoInput} type="file" accept="video/*" capture="user" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
              <input ref={fileInput} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
            </div>
          )}
          {media && (
            <div className="relative overflow-hidden rounded-card bg-black">
              {media.kind === 'photo' ? (
                <img src={media.previewUrl} alt="" className="max-h-[50vh] w-full object-contain" />
              ) : (
                <video src={media.previewUrl} className="max-h-[50vh] w-full" controls playsInline />
              )}
              <Button variant="glass" size="sm" className="absolute right-3 top-3" onClick={() => { URL.revokeObjectURL(media.previewUrl); setMedia(null) }}>
                <X className="size-4" /> {t('guest.removeMedia')}
              </Button>
            </div>
          )}
          {create.isPending && (
            <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-label="Upload progress">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.max(8, progress * 100)}%` }} />
            </div>
          )}
          <div className="mt-auto flex gap-3">
            <Button type="button" variant="secondary" size="xl" onClick={() => setStep('message')} disabled={create.isPending} aria-label={t('guest.back')}>
              <ArrowLeft className="size-5" />
            </Button>
            <Button size="xl" className="flex-1" onClick={() => void submit()} loading={create.isPending}>
              <Send className="size-5" /> {create.isPending ? t('guest.sending') : t('guest.send')}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center animate-rise">
          <span className="grid size-20 place-items-center rounded-full bg-success text-white">
            <Check className="size-10" />
          </span>
          <p className="font-hand text-4xl">{doneMessage}</p>
          <div className="flex w-full flex-col gap-3">
            <Button size="xl" onClick={reset}>{t('guest.another')}</Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="wall">{t('guest.viewWall')}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
