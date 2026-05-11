function normalizeEntryId(entryId) {
  return String(entryId)
}

export function buildReactionBuckets(reactions = []) {
  return reactions.reduce((buckets, reaction) => {
    const key = `${reaction.entryType}:${normalizeEntryId(reaction.entryId)}`
    const current = buckets.get(key) || { total: 0, breakdown: {} }
    current.total += 1
    current.breakdown[reaction.emoji] = (current.breakdown[reaction.emoji] || 0) + 1
    buckets.set(key, current)
    return buckets
  }, new Map())
}

export function sortReactionBreakdown(breakdown = {}) {
  return Object.entries(breakdown).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
}

export function getReactionSummary(entryType, entryId, reactionBuckets) {
  const summary = reactionBuckets.get(`${entryType}:${normalizeEntryId(entryId)}`)
  if (!summary) {
    return { total: 0, breakdown: {}, sortedBreakdown: [] }
  }

  return {
    total: summary.total,
    breakdown: summary.breakdown,
    sortedBreakdown: sortReactionBreakdown(summary.breakdown),
  }
}

function buildTypedEntries(entries, entryType) {
  return entries.map((entry) => ({ entry, type: entryType }))
}

export function buildReactionLeaderboard({ messages = [], boothPhotos = [], boothVideos = [], reactions = [] }, limit = 5) {
  const reactionBuckets = buildReactionBuckets(reactions)

  return [
    ...buildTypedEntries(messages, 'message'),
    ...buildTypedEntries(boothPhotos, 'photo'),
    ...buildTypedEntries(boothVideos, 'video'),
  ]
    .map(({ entry, type }) => {
      const reactionSummary = getReactionSummary(type, entry.id, reactionBuckets)
      return {
        entry,
        type,
        ...reactionSummary,
      }
    })
    .filter((item) => item.total > 0)
    .sort((left, right) => right.total - left.total || (right.entry.timestamp || 0) - (left.entry.timestamp || 0))
    .slice(0, limit)
}

export function buildReactionHighlights(data) {
  const leaderboard = buildReactionLeaderboard(data, Number.POSITIVE_INFINITY)
  const topByType = new Map()

  leaderboard.forEach((item) => {
    if (!topByType.has(item.type)) {
      topByType.set(item.type, item)
    }
  })

  return ['message', 'photo', 'video']
    .map((type) => topByType.get(type))
    .filter(Boolean)
}