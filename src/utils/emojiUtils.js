function segmentWithIntl(value) {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
    return null
  }

  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  return Array.from(segmenter.segment(value), ({ segment }) => segment)
}

export function splitEmojiTokens(value) {
  const source = String(value || '').trim()
  if (!source) return []

  return segmentWithIntl(source) || Array.from(source)
}

export function appendEmoji(value, emoji) {
  return [...splitEmojiTokens(value), emoji].join('')
}

export function removeEmojiAt(value, index) {
  const tokens = splitEmojiTokens(value)
  tokens.splice(index, 1)
  return tokens.join('')
}