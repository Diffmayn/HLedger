import { describe, expect, it, vi } from 'vitest'
import {
  ensureStorageHeadroom,
  mapBoothPhotoToSupabasePayload,
  mapBoothVideoToSupabasePayload,
  mapMessageToSupabasePayload,
  mapSupabaseRowToMessage,
  mapSupabaseRowToPhoto,
  mapSupabaseRowToVideo
} from './guestbookPersistence'

describe('ensureStorageHeadroom', () => {
  it('resolves when storage estimate is unavailable', async () => {
    await expect(ensureStorageHeadroom(1024, {})).resolves.toBeUndefined()
  })

  it('throws when remaining storage is too low', async () => {
    const storage = {
      estimate: vi.fn().mockResolvedValue({ usage: 95, quota: 100 })
    }

    await expect(ensureStorageHeadroom(10, storage)).rejects.toThrow('This device is low on browser storage')
  })
})

describe('Supabase row mappers', () => {
  it('maps a message row and converts embedded video data', () => {
    const message = mapSupabaseRowToMessage({
      id: 'msg-1',
      name: ' Jeannette ',
      message: 'Hello',
      emojis: '🎉',
      photo_data_url: 'data:image/png;base64,AAAA',
      video_data_url: 'data:video/webm;base64,AAAA',
      video_mime_type: 'video/webm',
      video_duration: 1200,
      video_thumbnail_data_url: 'data:image/jpeg;base64,BBBB',
      timestamp: '42'
    })

    expect(message).toMatchObject({
      id: 'msg-1',
      name: ' Jeannette ',
      message: 'Hello',
      emojis: '🎉',
      photoDataUrl: 'data:image/png;base64,AAAA',
      videoMimeType: 'video/webm',
      videoDuration: 1200,
      videoThumbnailDataUrl: 'data:image/jpeg;base64,BBBB',
      timestamp: 42
    })
    expect(message.videoBlob).toBeInstanceOf(Blob)
  })

  it('maps booth photo and video rows with safe fallbacks', () => {
    const photo = mapSupabaseRowToPhoto({
      id: 'photo-1',
      photo_data_url: 'data:image/png;base64,AAAA',
      caption: null,
      filters_used: 'not-an-array',
      is_strip: 1,
      timestamp: 'bad'
    })

    const video = mapSupabaseRowToVideo({
      id: 'video-1',
      source: '',
      filters_used: ['hat'],
      video_data_url: 'not-a-data-url',
      timestamp: 10
    })

    expect(photo.caption).toBe('')
    expect(photo.filtersUsed).toEqual([])
    expect(photo.isStrip).toBe(true)
    expect(Number.isFinite(photo.timestamp)).toBe(true)

    expect(video.source).toBe('booth')
    expect(video.filtersUsed).toEqual(['hat'])
    expect(video.videoBlob).toBeNull()
    expect(video.timestamp).toBe(10)
  })
})

describe('mapMessageToSupabasePayload', () => {
  it('trims fields and serializes an attached video blob', async () => {
    const payload = await mapMessageToSupabasePayload({
      name: ' Jeannette ',
      message: ' Congrats ',
      emojis: '🎉',
      photoDataUrl: 'data:image/png;base64,AAAA',
      videoBlob: new Blob(['video'], { type: 'video/webm' }),
      videoMimeType: 'video/webm',
      videoDuration: 2500,
      videoThumbnailDataUrl: 'data:image/jpeg;base64,BBBB'
    })

    expect(payload).toMatchObject({
      name: 'Jeannette',
      message: 'Congrats',
      emojis: '🎉',
      photo_data_url: 'data:image/png;base64,AAAA',
      video_mime_type: 'video/webm',
      video_duration: 2500,
      video_thumbnail_data_url: 'data:image/jpeg;base64,BBBB'
    })
    expect(payload.video_data_url).toMatch(/^data:video\/webm;base64,/) 
    expect(typeof payload.timestamp).toBe('number')
  })

  it('builds booth photo and video payloads with normalized defaults', async () => {
    const photoPayload = mapBoothPhotoToSupabasePayload({
      photoDataUrl: 'data:image/png;base64,AAAA',
      caption: '',
      filtersUsed: 'invalid',
      isStrip: 1
    })

    const videoPayload = await mapBoothVideoToSupabasePayload({
      videoBlob: new Blob(['video'], { type: 'video/webm' }),
      videoMimeType: 'video/webm',
      videoDuration: 3000,
      videoThumbnailDataUrl: 'data:image/jpeg;base64,BBBB',
      source: '',
      filtersUsed: ['glasses']
    })

    expect(photoPayload).toMatchObject({
      photo_data_url: 'data:image/png;base64,AAAA',
      caption: '',
      filters_used: [],
      is_strip: true
    })
    expect(typeof photoPayload.timestamp).toBe('number')

    expect(videoPayload).toMatchObject({
      video_mime_type: 'video/webm',
      video_duration: 3000,
      video_thumbnail_data_url: 'data:image/jpeg;base64,BBBB',
      source: 'booth',
      filters_used: ['glasses']
    })
    expect(videoPayload.video_data_url).toMatch(/^data:video\/webm;base64,/) 
    expect(typeof videoPayload.timestamp).toBe('number')
  })
})