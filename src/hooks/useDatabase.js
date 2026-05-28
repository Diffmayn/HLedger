import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '../data/db'
import { supabase, isSupabaseConfigured } from '../data/supabaseClient'
import {
  ensureStorageHeadroom,
  mapBoothPhotoToSupabasePayload,
  mapBoothVideoToSupabasePayload,
  mapMessageToSupabasePayload,
  mapSupabaseRowToMessage,
  mapSupabaseRowToPhoto,
  mapSupabaseRowToVideo
} from '../data/guestbookPersistence'
import { startSupabaseRealtimeQuery } from '../data/supabaseRealtime'

let cachedRemoteMessages = []
let cachedRemoteMessagesLoaded = false
let cachedRemotePhotos = []
let cachedRemotePhotosLoaded = false

function sortByNewest(items) {
  return [...items].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
}

function upsertById(items, nextItem) {
  const itemId = String(nextItem?.id || '')
  return sortByNewest([nextItem, ...items.filter((item) => String(item?.id || '') !== itemId)])
}

function removeById(items, id) {
  const itemId = String(id)
  return items.filter((item) => String(item?.id || '') !== itemId)
}

export function useMessages() {
  const localMessages = useLiveQuery(() => db.messages.orderBy('timestamp').reverse().toArray(), [])
  const [remoteMessages, setRemoteMessages] = useState(() => cachedRemoteMessages)
  const [remoteLoaded, setRemoteLoaded] = useState(() => cachedRemoteMessagesLoaded)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    return startSupabaseRealtimeQuery({
      supabaseClient: supabase,
      channelName: 'guestbook-messages',
      table: 'messages',
      runQuery: (query) => query.select('*').order('timestamp', { ascending: false }),
      onData: (data) => {
        const nextMessages = (data || []).map(mapSupabaseRowToMessage)
        cachedRemoteMessages = nextMessages
        cachedRemoteMessagesLoaded = true
        setRemoteMessages(nextMessages)
        setRemoteLoaded(true)
      },
      onError: (error) => {
        console.error('[useDatabase] Failed to load shared messages:', error)
        cachedRemoteMessagesLoaded = true
        setRemoteLoaded(true)
      }
    })
  }, [])

  const messages = isSupabaseConfigured ? remoteMessages : (localMessages || [])
  const loaded = isSupabaseConfigured ? remoteLoaded : localMessages !== undefined

  const addMessage = useCallback(async (msg) => {
    try {
      if (!isSupabaseConfigured && msg.videoBlob instanceof Blob) {
        await ensureStorageHeadroom(msg.videoBlob.size)
      }

      if (isSupabaseConfigured && supabase) {
        const payload = await mapMessageToSupabasePayload(msg)
        const { data, error } = await supabase
          .from('messages')
          .insert(payload)
          .select('*')
          .single()

        if (error) {
          console.error('[useDatabase] Failed to add shared message:', error)
          throw new Error('Unable to post this message to the shared guestbook right now.')
        }

        const insertedMessage = mapSupabaseRowToMessage(data)
        setRemoteMessages((prev) => {
          const nextMessages = upsertById(prev, insertedMessage)
          cachedRemoteMessages = nextMessages
          cachedRemoteMessagesLoaded = true
          return nextMessages
        })

        return insertedMessage.id
      }

      const id = await db.messages.add({ ...msg, timestamp: Date.now() })
      return id
    } catch (error) {
      console.error('[useDatabase] Failed to add message:', error)
      if (error?.name === 'QuotaExceededError') {
        throw new Error('Storage is full. Please remove some photos and try again.')
      }
      throw new Error('Unable to save this message. Please try again.')
    }
  }, [])

  const deleteMessage = useCallback(async (id) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', String(id))

      if (error) {
        console.error('[useDatabase] Failed to delete shared message:', error)
        throw new Error('Unable to delete this message right now. Please try again.')
      }

      setRemoteMessages((prev) => {
        const nextMessages = removeById(prev, id)
        cachedRemoteMessages = nextMessages
        return nextMessages
      })
    } else {
      await db.messages.delete(id)
      // Also clean up reactions
      await db.reactions.where({ entryType: 'message', entryId: id }).delete()
    }
  }, [])

  return { messages: messages || [], loaded, addMessage, deleteMessage }
}

export function useBoothPhotos() {
  const localPhotos = useLiveQuery(() => db.boothPhotos.orderBy('timestamp').reverse().toArray(), [])
  const [remotePhotos, setRemotePhotos] = useState(() => cachedRemotePhotos)
  const [remoteLoaded, setRemoteLoaded] = useState(() => cachedRemotePhotosLoaded)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    return startSupabaseRealtimeQuery({
      supabaseClient: supabase,
      channelName: 'guestbook-booth-photos',
      table: 'booth_photos',
      runQuery: (query) => query.select('*').order('timestamp', { ascending: false }),
      onData: (data) => {
        const nextPhotos = (data || []).map(mapSupabaseRowToPhoto)
        cachedRemotePhotos = nextPhotos
        cachedRemotePhotosLoaded = true
        setRemotePhotos(nextPhotos)
        setRemoteLoaded(true)
      },
      onError: (error) => {
        console.error('[useDatabase] Failed to load shared booth photos:', error)
        cachedRemotePhotosLoaded = true
        setRemoteLoaded(true)
      }
    })
  }, [])

  const photos = isSupabaseConfigured ? remotePhotos : (localPhotos || [])
  const loaded = isSupabaseConfigured ? remoteLoaded : localPhotos !== undefined

  const addBoothPhoto = useCallback(async (photo) => {
    try {
      if (isSupabaseConfigured && supabase) {
        const payload = mapBoothPhotoToSupabasePayload(photo)

        const { data, error } = await supabase
          .from('booth_photos')
          .insert(payload)
          .select('*')
          .single()

        if (error) {
          console.error('[useDatabase] Failed to insert shared booth photo:', error)
          throw new Error(`Unable to save shared booth photo: ${error.message || error.code || 'unknown error'}`)
        }

        const insertedPhoto = mapSupabaseRowToPhoto(data)
        setRemotePhotos((prev) => {
          const nextPhotos = upsertById(prev, insertedPhoto)
          cachedRemotePhotos = nextPhotos
          cachedRemotePhotosLoaded = true
          return nextPhotos
        })

        return insertedPhoto.id
      }

      const id = await db.boothPhotos.add({ ...photo, timestamp: Date.now() })
      return id
    } catch (error) {
      if (error?.name === 'QuotaExceededError') {
        throw new Error('Storage is full. Please remove some saved photos and try again.')
      }
      if (error?.message?.startsWith('Unable to save shared booth photo:')) {
        throw error
      }
      throw new Error('Unable to save photo right now. Please try again.')
    }
  }, [])

  const deleteBoothPhoto = useCallback(async (id) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('booth_photos')
        .delete()
        .eq('id', String(id))

      if (error) {
        console.error('[useDatabase] Failed to delete shared booth photo:', error)
        throw new Error('Unable to delete this photo right now. Please try again.')
      }

      setRemotePhotos((prev) => {
        const nextPhotos = removeById(prev, id)
        cachedRemotePhotos = nextPhotos
        return nextPhotos
      })
    } else {
      await db.boothPhotos.delete(id)
      await db.reactions.where({ entryType: 'photo', entryId: id }).delete()
    }
  }, [])

  return { photos: photos || [], loaded, addBoothPhoto, deleteBoothPhoto }
}

export function useBoothVideos() {
  const localVideos = useLiveQuery(() => db.boothVideos.orderBy('timestamp').reverse().toArray(), [])
  const [remoteVideos, setRemoteVideos] = useState([])
  const [remoteLoaded, setRemoteLoaded] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    return startSupabaseRealtimeQuery({
      supabaseClient: supabase,
      channelName: 'guestbook-booth-videos',
      table: 'booth_videos',
      runQuery: (query) => query.select('*').order('timestamp', { ascending: false }),
      onData: (data) => {
        setRemoteVideos((data || []).map(mapSupabaseRowToVideo))
        setRemoteLoaded(true)
      },
      onError: (error) => {
        console.error('[useDatabase] Failed to load shared booth videos:', error)
        setRemoteLoaded(true)
      }
    })
  }, [])

  const videos = isSupabaseConfigured ? remoteVideos : (localVideos || [])
  const loaded = isSupabaseConfigured ? remoteLoaded : localVideos !== undefined

  const addBoothVideo = useCallback(async (video) => {
    try {
      if (!isSupabaseConfigured && video.videoBlob) {
        await ensureStorageHeadroom(video.videoBlob.size)
      }

      if (isSupabaseConfigured && supabase) {
        const payload = await mapBoothVideoToSupabasePayload(video)

        const { data, error } = await supabase
          .from('booth_videos')
          .insert(payload)
          .select('id')
          .single()

        if (error) {
          throw new Error('Unable to save this booth video to the shared guestbook right now.')
        }

        return data.id
      }

      const id = await db.boothVideos.add({ ...video, timestamp: Date.now() })
      return id
    } catch (error) {
      if (error?.name === 'QuotaExceededError') {
        throw new Error('Storage is full. Please remove some saved videos and try again.')
      }
      throw error instanceof Error ? error : new Error('Unable to save video right now. Please try again.')
    }
  }, [])

  const deleteBoothVideo = useCallback(async (id) => {
    if (isSupabaseConfigured && supabase) {
      throw new Error('Shared guestbook entries cannot be deleted from the public app.')
    } else {
      await db.boothVideos.delete(id)
      await db.reactions.where({ entryType: 'video', entryId: id }).delete()
    }
  }, [])

  return { videos: videos || [], loaded, addBoothVideo, deleteBoothVideo }
}

export function useReactions() {
  const localReactions = useLiveQuery(() => db.reactions.toArray(), [])
  const [remoteReactions, setRemoteReactions] = useState([])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    return startSupabaseRealtimeQuery({
      supabaseClient: supabase,
      channelName: 'guestbook-reactions',
      table: 'reactions',
      runQuery: (query) => query.select('*'),
      onData: (data) => setRemoteReactions(data || []),
      onError: (error) => {
        console.error('[useDatabase] Failed to load shared reactions:', error)
      }
    })
  }, [])

  const reactions = isSupabaseConfigured
    ? remoteReactions.map((reaction) => ({
        id: reaction.id,
        entryType: reaction.entry_type,
        entryId: reaction.entry_id,
        emoji: reaction.emoji,
        timestamp: reaction.timestamp
      }))
    : (localReactions || [])

  const addReaction = useCallback(async (entryType, entryId, emoji) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('reactions').insert({
        entry_type: entryType,
        entry_id: String(entryId),
        emoji,
        timestamp: Date.now()
      })
      if (error) {
        throw new Error('Unable to save reaction right now.')
      }
      return
    }

    await db.reactions.add({ entryType, entryId, emoji, timestamp: Date.now() })
  }, [])

  const getReactionsFor = useCallback((entryType, entryId) => {
    if (!reactions) return {}
    const entryIdString = String(entryId)
    const filtered = reactions.filter(r => r.entryType === entryType && String(r.entryId) === entryIdString)
    const counts = {}
    filtered.forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1 })
    return counts
  }, [reactions])

  return { reactions: reactions || [], addReaction, getReactionsFor }
}

export function useSpeech() {
  const localSpeeches = useLiveQuery(() => db.speech.toArray(), [])
  const [remoteSpeech, setRemoteSpeech] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    return startSupabaseRealtimeQuery({
      supabaseClient: supabase,
      channelName: 'guestbook-speech',
      table: 'speech',
      runQuery: (query) => query.select('*').eq('id', 'shared').maybeSingle(),
      onData: (data) => {
        setRemoteSpeech(data ? {
          id: data.id,
          title: data.title || '',
          body: data.body || '',
          author: data.author || ''
        } : null)
      },
      onError: (error) => {
        console.error('[useDatabase] Failed to load shared speech:', error)
      }
    })
  }, [])

  const saveSpeech = useCallback(async (speech) => {
    if (isSupabaseConfigured && supabase) {
      const payload = {
        id: 'shared',
        title: speech.title || '',
        body: speech.body || '',
        author: speech.author || '',
        updated_at: Date.now()
      }

      const { error } = await supabase.from('speech').upsert(payload, { onConflict: 'id' })
      if (error) {
        throw new Error('Unable to save the shared speech right now.')
      }

      return 'shared'
    }

    const existing = await db.speech.toArray()
    if (existing.length > 0) {
      await db.speech.update(existing[0].id, speech)
      return existing[0].id
    }
    return await db.speech.add(speech)
  }, [])

  return { speech: isSupabaseConfigured ? remoteSpeech : (localSpeeches?.[0] || null), saveSpeech }
}

export function useSettings() {
  const localSettings = useLiveQuery(() => db.settings.toArray(), [])
  const [remoteSettings, setRemoteSettings] = useState([])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    return startSupabaseRealtimeQuery({
      supabaseClient: supabase,
      channelName: 'guestbook-settings',
      table: 'settings',
      runQuery: (query) => query.select('*'),
      onData: (data) => setRemoteSettings((data || []).map((row) => ({ key: row.key, value: row.value_json }))),
      onError: (error) => {
        console.error('[useDatabase] Failed to load shared settings:', error)
      }
    })
  }, [])

  const settings = isSupabaseConfigured ? remoteSettings : (localSettings || [])

  const getSetting = useCallback((key) => {
    if (!settings) return null
    const s = settings.find(s => s.key === key)
    return s?.value ?? null
  }, [settings])

  const setSetting = useCallback(async (key, value) => {
    if (isSupabaseConfigured && supabase) {
      const payload = {
        key,
        value_json: value,
        updated_at: Date.now()
      }
      const { error } = await supabase.from('settings').upsert(payload, { onConflict: 'key' })
      if (error) {
        throw new Error('Unable to save this shared setting right now.')
      }
      return
    }

    await db.settings.put({ key, value })
  }, [])

  return { getSetting, setSetting }
}
