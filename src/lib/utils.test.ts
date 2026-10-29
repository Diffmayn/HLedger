import { describe, expect, it } from 'vitest'
import { formatDuration, relativeTime, splitEmoji } from './utils'

describe('utils', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65_400)).toBe('1:05')
  })
  it('splits emoji into graphemes', () => {
    expect(splitEmoji('👍🏽❤️🎉')).toEqual(['👍🏽', '❤️', '🎉'])
    expect(splitEmoji('')).toEqual([])
  })
  it('relative time buckets', () => {
    const now = Date.parse('2026-10-29T12:00:00Z')
    expect(relativeTime('2026-10-29T11:59:50Z', now)).toBe('just now')
    expect(relativeTime('2026-10-29T11:30:00Z', now)).toBe('30 min ago')
    expect(relativeTime('2026-10-29T09:00:00Z', now)).toBe('3 h ago')
  })
})
