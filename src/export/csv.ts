import type { Entry, GuestbookEvent } from '@/types/domain'
import { download, fileStem, published } from './common'

function cell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function exportCsv(event: GuestbookEvent, entries: Entry[]) {
  const rows = [
    ['created_at', 'kind', 'author', 'message', 'emojis', 'media_url', 'thumb_url', 'duration_ms', 'filters'],
    ...published(entries).map((e) => [
      e.createdAt,
      e.kind,
      e.authorName,
      e.body,
      e.emojis,
      e.mediaUrl ?? '',
      e.thumbUrl ?? '',
      e.durationMs,
      e.filtersUsed.join('|'),
    ]),
  ]
  const csv = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${fileStem(event)}.csv`)
}
