import Dexie from 'dexie'

const db = new Dexie('JeannettesGuestbook')

db.version(1).stores({
  messages: '++id, name, timestamp',
  boothPhotos: '++id, timestamp',
  speech: '++id',
  settings: 'key'
})

db.version(2).stores({
  messages: '++id, name, timestamp',
  boothPhotos: '++id, timestamp',
  speech: '++id',
  settings: 'key',
  reactions: '++id, entryType, entryId, emoji, timestamp'
})

// Version 3: Add warping/morphing support for filters
db.version(3).stores({
  messages: '++id, name, timestamp',
  boothPhotos: '++id, timestamp',
  speech: '++id',
  settings: 'key',
  reactions: '++id, entryType, entryId, emoji, timestamp'
}).upgrade(tx => {
  // Add warpingApplied flag to existing photos (default to false for backwards compatibility)
  return tx.boothPhotos.toCollection().modify(photo => {
    photo.warpingApplied = photo.warpingApplied || false
    photo.warpedFilters = photo.warpedFilters || [] // Track which filters were warped
  })
})

db.version(4).stores({
  messages: '++id, name, timestamp',
  boothPhotos: '++id, timestamp',
  boothVideos: '++id, timestamp, source',
  speech: '++id',
  settings: 'key',
  reactions: '++id, entryType, entryId, emoji, timestamp'
}).upgrade(tx => {
  return tx.messages.toCollection().modify(message => {
    message.videoMimeType = message.videoMimeType || null
    message.videoDuration = message.videoDuration || 0
    message.videoThumbnailDataUrl = message.videoThumbnailDataUrl || null
  })
})

export default db
