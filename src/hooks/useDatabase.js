import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '../data/db'
import { supabase, isSupabaseConfigured } from '../data/supabaseClient'
import { blobToDataUrl, dataUrlToBlob } from '../utils/blobUtils'

async function ensureStorageHeadroom(additionalBytes = 0) {
  if (!additionalBytes || !navigator.storage?.estimate) return

  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  if (!quota) return

  const remaining = quota - usage
  const required = Math.max(additionalBytes * 1.2, 10 * 1024 * 1024)
  if (remaining < required) {
    throw new Error('This device is low on browser storage. Please remove some saved media and try again.')
  }
}

function mapSupabaseRowToMessage(row) {
  const timestamp = Number(row.timestamp)
  let videoBlob = null
  if (row.video_data_url) {
    try {
      videoBlob = dataUrlToBlob(row.video_data_url)
    } catch (_) {
      videoBlob = null
    }
  }

  return {
    id: row.id,
    name: row.name || '',
    message: row.message || '',
    emojis: row.emojis || '',
    photoDataUrl: row.photo_data_url || null,
    videoBlob,
    videoMimeType: row.video_mime_type || null,
    videoDuration: row.video_duration || 0,
    videoThumbnailDataUrl: row.video_thumbnail_data_url || null,
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now()
  }
}

function mapSupabaseRowToPhoto(row) {
  const timestamp = Number(row.timestamp)
  return {
    id: row.id,
    photoDataUrl: row.photo_data_url || null,
    caption: row.caption || '',
    filtersUsed: Array.isArray(row.filters_used) ? row.filters_used : [],
    isStrip: !!row.is_strip,
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now()
  }
}

function mapSupabaseRowToVideo(row) {
  const timestamp = Number(row.timestamp)
  let videoBlob = null
  if (row.video_data_url) {
    try {
      videoBlob = dataUrlToBlob(row.video_data_url)
    } catch (_) {
      videoBlob = null
    }
  }

  return {
    id: row.id,
    videoBlob,
    videoMimeType: row.video_mime_type || null,
    videoDuration: row.video_duration || 0,
    videoThumbnailDataUrl: row.video_thumbnail_data_url || null,
    source: row.source || 'booth',
    filtersUsed: Array.isArray(row.filters_used) ? row.filters_used : [],
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now()
  }
}

async function mapMessageToSupabasePayload(msg) {
  let videoDataUrl = null
  if (msg.videoBlob instanceof Blob) {
    videoDataUrl = await blobToDataUrl(msg.videoBlob)
  }

  return {
    name: String(msg.name || '').trim(),
    message: String(msg.message || '').trim(),
    emojis: msg.emojis || '',
    photo_data_url: msg.photoDataUrl || null,
    video_data_url: videoDataUrl,
    video_mime_type: msg.videoMimeType || null,
    video_duration: msg.videoDuration || 0,
    video_thumbnail_data_url: msg.videoThumbnailDataUrl || null,
    timestamp: Date.now()
  }
}

export function useMessages() {
  const localMessages = useLiveQuery(() => db.messages.orderBy('timestamp').reverse().toArray(), [])
  const [remoteMessages, setRemoteMessages] = useState([])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    let cancelled = false

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('[useDatabase] Failed to load shared messages:', error)
        return
      }

      if (!cancelled) {
        setRemoteMessages((data || []).map(mapSupabaseRowToMessage))
      }
    }

    loadMessages()

    const channel = supabase
      .channel('guestbook-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          void loadMessages()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const messages = isSupabaseConfigured ? remoteMessages : (localMessages || [])

  useEffect(() => {
    if (messages && messages.length > 0) {
      const withPhotos = messages.filter(m => m.photoDataUrl).length
      console.log(`[useMessages] Retrieved ${messages.length} messages, ${withPhotos} have photos`)
    }
  }, [messages])

  const addMessage = useCallback(async (msg) => {
    try {
      const hasPhoto = msg.photoDataUrl ? msg.photoDataUrl.length : 0
      console.log(`[useDatabase] Adding message from "${msg.name}" with photo: ${hasPhoto > 0 ? `${hasPhoto} bytes` : 'none'}`)
      if (!isSupabaseConfigured && msg.videoBlob instanceof Blob) {
        await ensureStorageHeadroom(msg.videoBlob.size)
      }

      if (isSupabaseConfigured && supabase) {
        const payload = await mapMessageToSupabasePayload(msg)
        const { data, error } = await supabase
          .from('messages')
          .insert(payload)
          .select('id')
          .single()

        if (error) {
          console.error('[useDatabase] Failed to add shared message:', error)
          throw new Error('Unable to post this message to the shared guestbook right now.')
        }

        return data.id
      }

      const id = await db.messages.add({ ...msg, timestamp: Date.now() })
      console.log(`[useDatabase] Message added with ID: ${id}`)
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
      const { error } = await supabase.from('messages').delete().eq('id', id)
      if (error) {
        throw new Error('Unable to remove this shared message right now.')
      }
      await supabase.from('reactions').delete().eq('entry_type', 'message').eq('entry_id', String(id))
    } else {
      await db.messages.delete(id)
      // Also clean up reactions
      await db.reactions.where({ entryType: 'message', entryId: id }).delete()
    }
  }, [])

  return { messages: messages || [], addMessage, deleteMessage }
}

export function useBoothPhotos() {
  const localPhotos = useLiveQuery(() => db.boothPhotos.orderBy('timestamp').reverse().toArray(), [])
  const [remotePhotos, setRemotePhotos] = useState([])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    let cancelled = false

    const loadPhotos = async () => {
      const { data, error } = await supabase
        .from('booth_photos')
        .select('*')
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('[useDatabase] Failed to load shared booth photos:', error)
        return
      }

      if (!cancelled) {
        setRemotePhotos((data || []).map(mapSupabaseRowToPhoto))
      }
    }

    loadPhotos()

    const channel = supabase
      .channel('guestbook-booth-photos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booth_photos' },
        () => {
          void loadPhotos()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const photos = isSupabaseConfigured ? remotePhotos : (localPhotos || [])

  const addBoothPhoto = useCallback(async (photo) => {
    try {
      if (isSupabaseConfigured && supabase) {
        const payload = {
          photo_data_url: photo.photoDataUrl || null,
          caption: photo.caption || '',
          filters_used: Array.isArray(photo.filtersUsed) ? photo.filtersUsed : [],
          is_strip: !!photo.isStrip,
          timestamp: Date.now()
        }

        const { data, error } = await supabase
          .from('booth_photos')
          .insert(payload)
          .select('id')
          .single()

        if (error) {
          throw new Error('Unable to save this booth photo to the shared guestbook right now.')
        }

        return data.id
      }

      const id = await db.boothPhotos.add({ ...photo, timestamp: Date.now() })
      return id
    } catch (error) {
      if (error?.name === 'QuotaExceededError') {
        throw new Error('Storage is full. Please remove some saved photos and try again.')
      }
      throw new Error('Unable to save photo right now. Please try again.')
    }
  }, [])

  const deleteBoothPhoto = useCallback(async (id) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('booth_photos').delete().eq('id', id)
      if (error) {
        throw new Error('Unable to remove this shared booth photo right now.')
      }
      await supabase.from('reactions').delete().eq('entry_type', 'photo').eq('entry_id', String(id))
    } else {
      await db.boothPhotos.delete(id)
      await db.reactions.where({ entryType: 'photo', entryId: id }).delete()
    }
  }, [])

  return { photos: photos || [], addBoothPhoto, deleteBoothPhoto }
}

export function useBoothVideos() {
  const localVideos = useLiveQuery(() => db.boothVideos.orderBy('timestamp').reverse().toArray(), [])
  const [remoteVideos, setRemoteVideos] = useState([])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    let cancelled = false

    const loadVideos = async () => {
      const { data, error } = await supabase
        .from('booth_videos')
        .select('*')
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('[useDatabase] Failed to load shared booth videos:', error)
        return
      }

      if (!cancelled) {
        setRemoteVideos((data || []).map(mapSupabaseRowToVideo))
      }
    }

    loadVideos()

    const channel = supabase
      .channel('guestbook-booth-videos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booth_videos' },
        () => {
          void loadVideos()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const videos = isSupabaseConfigured ? remoteVideos : (localVideos || [])

  const addBoothVideo = useCallback(async (video) => {
    try {
      if (!isSupabaseConfigured && video.videoBlob) {
        await ensureStorageHeadroom(video.videoBlob.size)
      }

      if (isSupabaseConfigured && supabase) {
        const videoDataUrl = video.videoBlob instanceof Blob ? await blobToDataUrl(video.videoBlob) : null
        const payload = {
          video_data_url: videoDataUrl,
          video_mime_type: video.videoMimeType || null,
          video_duration: video.videoDuration || 0,
          video_thumbnail_data_url: video.videoThumbnailDataUrl || null,
          source: video.source || 'booth',
          filters_used: Array.isArray(video.filtersUsed) ? video.filtersUsed : [],
          timestamp: Date.now()
        }

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
      const { error } = await supabase.from('booth_videos').delete().eq('id', id)
      if (error) {
        throw new Error('Unable to remove this shared booth video right now.')
      }
      await supabase.from('reactions').delete().eq('entry_type', 'video').eq('entry_id', String(id))
    } else {
      await db.boothVideos.delete(id)
      await db.reactions.where({ entryType: 'video', entryId: id }).delete()
    }
  }, [])

  return { videos: videos || [], addBoothVideo, deleteBoothVideo }
}

export function useReactions() {
  const localReactions = useLiveQuery(() => db.reactions.toArray(), [])
  const [remoteReactions, setRemoteReactions] = useState([])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    let cancelled = false

    const loadReactions = async () => {
      const { data, error } = await supabase
        .from('reactions')
        .select('*')

      if (error) {
        console.error('[useDatabase] Failed to load shared reactions:', error)
        return
      }

      if (!cancelled) {
        setRemoteReactions(data || [])
      }
    }

    loadReactions()

    const channel = supabase
      .channel('guestbook-reactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        () => {
          void loadReactions()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
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

    let cancelled = false

    const loadSpeech = async () => {
      const { data, error } = await supabase
        .from('speech')
        .select('*')
        .eq('id', 'shared')
        .maybeSingle()

      if (error) {
        console.error('[useDatabase] Failed to load shared speech:', error)
        return
      }

      if (!cancelled) {
        setRemoteSpeech(data ? {
          id: data.id,
          title: data.title || '',
          body: data.body || '',
          author: data.author || ''
        } : null)
      }
    }

    loadSpeech()

    const channel = supabase
      .channel('guestbook-speech')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'speech' },
        () => {
          void loadSpeech()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
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

    let cancelled = false

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')

      if (error) {
        console.error('[useDatabase] Failed to load shared settings:', error)
        return
      }

      if (!cancelled) {
        setRemoteSettings((data || []).map((row) => ({ key: row.key, value: row.value_json })))
      }
    }

    loadSettings()

    const channel = supabase
      .channel('guestbook-settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        () => {
          void loadSettings()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
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
