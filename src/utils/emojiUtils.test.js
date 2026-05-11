import { describe, expect, it } from 'vitest'
import { appendEmoji, removeEmojiAt, splitEmojiTokens } from './emojiUtils'

describe('emojiUtils', () => {
  it('splits emoji strings into grapheme-safe tokens', () => {
    expect(splitEmojiTokens('🎉👏')).toEqual(['🎉', '👏'])
  })

  it('appends and removes emojis predictably', () => {
    const withParty = appendEmoji('🎉', '🥳')
    expect(withParty).toBe('🎉🥳')
    expect(removeEmojiAt(withParty, 0)).toBe('🥳')
  })
})