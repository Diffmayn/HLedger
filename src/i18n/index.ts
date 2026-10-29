import { create } from 'zustand'

export type Lang = 'en' | 'da'

const strings = {
  en: {
    appName: 'Guestbook',
    loading: 'Loading…',
    eventNotFound: 'This guestbook does not exist.',
    notConfigured: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    guest: {
      heading: 'Leave a message for {title}',
      yourName: 'Your name',
      namePlaceholder: 'Who is this from?',
      message: 'Your message',
      messagePlaceholder: 'Write something they will keep…',
      addMedia: 'Add a photo or video',
      takePhoto: 'Take a photo',
      recordVideo: 'Record a video',
      chooseFile: 'Choose from library',
      removeMedia: 'Remove',
      next: 'Next',
      back: 'Back',
      send: 'Send to the wall',
      sending: 'Sending…',
      sent: 'It’s on the wall!',
      sentPending: 'Thanks! The host will publish it shortly.',
      sentOffline: 'Saved. It will be sent as soon as you are back online.',
      another: 'Write another',
      viewWall: 'See the wall',
      tooLong: 'Keep it under {max} seconds.',
      rateLimited: 'Give it a few seconds before posting again.',
      emojiHint: 'Add emoji',
    },
    wall: {
      waiting: 'Waiting for the first message…',
      scanToPost: 'Scan to post',
      messages: '{n} messages',
      photos: '{n} photos',
      videos: '{n} videos',
      slideshow: 'Slideshow',
      grid: 'Grid',
      newEntry: 'New message from {name}',
    },
    booth: {
      title: 'Photo booth',
      single: 'Photo',
      strip: 'Strip',
      video: 'Video',
      tapToStart: 'Tap to start',
      attract: 'Step in and strike a pose',
      loadingFilters: 'Loading face filters…',
      noFace: 'Step into the frame',
      cameraDenied: 'Camera access is needed for the booth.',
      retake: 'Retake',
      keep: 'Send to the wall',
      recording: 'Recording',
      stop: 'Stop',
      none: 'No filter',
      sent: 'Sent!',
      yourName: 'Your name (optional)',
    },
    host: {
      signIn: 'Sign in',
      email: 'Email',
      sendLink: 'Send magic link',
      linkSent: 'Check your inbox for the sign-in link.',
      signOut: 'Sign out',
      events: 'Your events',
      newEvent: 'New event',
      moderation: 'Moderation',
      pending: 'Pending',
      hidden: 'Hidden',
      published: 'Published',
      publish: 'Publish',
      hide: 'Hide',
      restore: 'Restore',
      delete: 'Delete',
      confirmDelete: 'Delete this entry permanently?',
      speech: 'Speech',
      export: 'Export',
      qr: 'QR code',
      links: 'Links',
      save: 'Save',
      saved: 'Saved',
    },
    reactions: { react: 'React' },
  },
  da: {
    appName: 'Gæstebog',
    loading: 'Indlæser…',
    eventNotFound: 'Denne gæstebog findes ikke.',
    notConfigured: 'Supabase er ikke sat op. Sæt VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY.',
    guest: {
      heading: 'Skriv en hilsen til {title}',
      yourName: 'Dit navn',
      namePlaceholder: 'Hvem er hilsenen fra?',
      message: 'Din hilsen',
      messagePlaceholder: 'Skriv noget, de vil gemme…',
      addMedia: 'Tilføj foto eller video',
      takePhoto: 'Tag et foto',
      recordVideo: 'Optag en video',
      chooseFile: 'Vælg fra biblioteket',
      removeMedia: 'Fjern',
      next: 'Næste',
      back: 'Tilbage',
      send: 'Send til væggen',
      sending: 'Sender…',
      sent: 'Den er på væggen!',
      sentPending: 'Tak! Værten udgiver den om lidt.',
      sentOffline: 'Gemt. Den sendes, så snart du er online igen.',
      another: 'Skriv en til',
      viewWall: 'Se væggen',
      tooLong: 'Hold den under {max} sekunder.',
      rateLimited: 'Vent et par sekunder, før du poster igen.',
      emojiHint: 'Tilføj emoji',
    },
    wall: {
      waiting: 'Venter på den første hilsen…',
      scanToPost: 'Scan for at skrive',
      messages: '{n} hilsner',
      photos: '{n} fotos',
      videos: '{n} videoer',
      slideshow: 'Slideshow',
      grid: 'Oversigt',
      newEntry: 'Ny hilsen fra {name}',
    },
    booth: {
      title: 'Fotoboks',
      single: 'Foto',
      strip: 'Strimmel',
      video: 'Video',
      tapToStart: 'Tryk for at starte',
      attract: 'Træd ind og find din pose',
      loadingFilters: 'Indlæser ansigtsfiltre…',
      noFace: 'Træd ind i billedet',
      cameraDenied: 'Fotoboksen har brug for adgang til kameraet.',
      retake: 'Tag om',
      keep: 'Send til væggen',
      recording: 'Optager',
      stop: 'Stop',
      none: 'Intet filter',
      sent: 'Sendt!',
      yourName: 'Dit navn (valgfrit)',
    },
    host: {
      signIn: 'Log ind',
      email: 'E-mail',
      sendLink: 'Send login-link',
      linkSent: 'Tjek din indbakke for login-linket.',
      signOut: 'Log ud',
      events: 'Dine events',
      newEvent: 'Nyt event',
      moderation: 'Moderation',
      pending: 'Afventer',
      hidden: 'Skjult',
      published: 'Udgivet',
      publish: 'Udgiv',
      hide: 'Skjul',
      restore: 'Gendan',
      delete: 'Slet',
      confirmDelete: 'Slet denne hilsen permanent?',
      speech: 'Tale',
      export: 'Eksport',
      qr: 'QR-kode',
      links: 'Links',
      save: 'Gem',
      saved: 'Gemt',
    },
    reactions: { react: 'Reager' },
  },
} as const

type Strings = typeof strings.en

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]

export type I18nKey = Leaves<Strings>

interface I18nState {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useI18nStore = create<I18nState>((set) => ({
  lang: 'en',
  setLang: (lang) => set({ lang }),
}))

function lookup(lang: Lang, key: string): string {
  const parts = key.split('.')
  let node: unknown = strings[lang]
  for (const p of parts) {
    node = (node as Record<string, unknown> | undefined)?.[p]
  }
  if (typeof node === 'string') return node
  if (lang !== 'en') return lookup('en', key)
  return key
}

export function t(key: I18nKey, vars?: Record<string, string | number>, lang?: Lang): string {
  const base = lookup(lang ?? useI18nStore.getState().lang, key)
  if (!vars) return base
  return base.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`))
}

export function useT() {
  const lang = useI18nStore((s) => s.lang)
  return (key: I18nKey, vars?: Record<string, string | number>) => t(key, vars, lang)
}
