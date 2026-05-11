import { blobToDataUrl, dataUrlToBlob } from '../utils/blobUtils'

function normalizeTimestamp(value) {
  const timestamp = Number(value)
  return Number.isFinite(timestamp) ? timestamp : Date.now()
}

export async function ensureStorageHeadroom(additionalBytes = 0, storage = navigator.storage) {
  if (!additionalBytes || !storage?.estimate) return

  const { usage = 0, quota = 0 } = await storage.estimate()
  if (!quota) return

  const remaining = quota - usage
  const required = Math.max(additionalBytes * 1.2, 10 * 1024 * 1024)
  if (remaining < required) {
    throw new Error('This device is low on browser storage. Please remove some saved media and try again.')
  }
}

export function mapSupabaseRowToMessage(row) {
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
    timestamp: normalizeTimestamp(row.timestamp)
  }
}

export function mapSupabaseRowToPhoto(row) {
  return {
    id: row.id,
    photoDataUrl: row.photo_data_url || null,
    caption: row.caption || '',
    filtersUsed: Array.isArray(row.filters_used) ? row.filters_used : [],
    isStrip: !!row.is_strip,
    timestamp: normalizeTimestamp(row.timestamp)
  }
}

export function mapSupabaseRowToVideo(row) {
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
    timestamp: normalizeTimestamp(row.timestamp)
  }
}

export async function mapMessageToSupabasePayload(message) {
  let videoDataUrl = null
  if (message.videoBlob instanceof Blob) {
    videoDataUrl = await blobToDataUrl(message.videoBlob)
  }

  return {
    name: String(message.name || '').trim(),
    message: String(message.message || '').trim(),
    emojis: message.emojis || '',
    photo_data_url: message.photoDataUrl || null,
    video_data_url: videoDataUrl,
    video_mime_type: message.videoMimeType || null,
    video_duration: message.videoDuration || 0,
    video_thumbnail_data_url: message.videoThumbnailDataUrl || null,
    timestamp: Date.now()
  }
}

export function mapBoothPhotoToSupabasePayload(photo) {
  return {
    photo_data_url: photo.photoDataUrl || null,
    caption: photo.caption || '',
    filters_used: Array.isArray(photo.filtersUsed) ? photo.filtersUsed : [],
    is_strip: !!photo.isStrip,
    timestamp: Date.now()
  }
}

export async function mapBoothVideoToSupabasePayload(video) {
  const videoDataUrl = video.videoBlob instanceof Blob ? await blobToDataUrl(video.videoBlob) : null

  return {
    video_data_url: videoDataUrl,
    video_mime_type: video.videoMimeType || null,
    video_duration: video.videoDuration || 0,
    video_thumbnail_data_url: video.videoThumbnailDataUrl || null,
    source: video.source || 'booth',
    filters_used: Array.isArray(video.filtersUsed) ? video.filtersUsed : [],
    timestamp: Date.now()
  }
}