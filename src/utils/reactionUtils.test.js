import { describe, expect, it } from 'vitest'
import { buildReactionBuckets, buildReactionHighlights, buildReactionLeaderboard, getReactionSummary } from './reactionUtils'

describe('reactionUtils', () => {
  const messages = [
    { id: 'm-1', name: 'Anna', message: 'Congrats!', timestamp: 10 },
    { id: 'm-2', name: 'Bo', message: 'Well done!', timestamp: 20 },
  ]
  const boothPhotos = [
    { id: 'p-1', photoDataUrl: 'data:image/jpeg;base64,abc', timestamp: 30 },
  ]
  const boothVideos = [
    { id: 'v-1', videoBlob: new Blob(['video'], { type: 'video/webm' }), timestamp: 40 },
  ]
  const reactions = [
    { entryType: 'message', entryId: 'm-1', emoji: '❤️' },
    { entryType: 'message', entryId: 'm-1', emoji: '❤️' },
    { entryType: 'message', entryId: 'm-2', emoji: '🎉' },
    { entryType: 'photo', entryId: 'p-1', emoji: '😍' },
    { entryType: 'photo', entryId: 'p-1', emoji: '❤️' },
    { entryType: 'video', entryId: 'v-1', emoji: '🔥' },
    { entryType: 'video', entryId: 'v-1', emoji: '🔥' },
    { entryType: 'video', entryId: 'v-1', emoji: '🔥' },
  ]

  it('groups reactions into per-entry buckets', () => {
    const buckets = buildReactionBuckets(reactions)
    expect(getReactionSummary('message', 'm-1', buckets)).toEqual({
      total: 2,
      breakdown: { '❤️': 2 },
      sortedBreakdown: [['❤️', 2]],
    })
  })

  it('builds a leaderboard ordered by reaction total', () => {
    const leaderboard = buildReactionLeaderboard({ messages, boothPhotos, boothVideos, reactions }, 3)
    expect(leaderboard.map((item) => `${item.type}:${item.entry.id}`)).toEqual([
      'video:v-1',
      'photo:p-1',
      'message:m-1',
    ])
  })

  it('selects one highlight per entry type', () => {
    const highlights = buildReactionHighlights({ messages, boothPhotos, boothVideos, reactions })
    expect(highlights.map((item) => item.type)).toEqual(['message', 'photo', 'video'])
    expect(highlights.map((item) => item.entry.id)).toEqual(['m-1', 'p-1', 'v-1'])
  })
})