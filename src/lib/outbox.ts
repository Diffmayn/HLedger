import { createStore, del, get, keys, set } from 'idb-keyval'
import type { CreateEntryInput } from '@/data/entries'

export interface OutboxItem {
  id: string
  createdAt: number
  input: CreateEntryInput
  attempts?: number
}

const store = createStore('hledger-outbox', 'posts')
const MAX_ATTEMPTS = 8

export async function enqueueOutbox(item: OutboxItem): Promise<void> {
  await set(item.id, item, store)
}

export async function listOutbox(): Promise<OutboxItem[]> {
  const ids = (await keys(store)) as string[]
  const items = await Promise.all(ids.map((k) => get<OutboxItem>(k, store)))
  return items.filter((i): i is OutboxItem => Boolean(i)).sort((a, b) => a.createdAt - b.createdAt)
}

/** Runs `send` for each queued item in order; stops at the first failure. */
export async function drainOutbox(send: (item: OutboxItem) => Promise<boolean>): Promise<number> {
  if (!navigator.onLine) return 0
  let sent = 0
  for (const item of await listOutbox()) {
    try {
      const ok = await send(item)
      if (!ok) break
      await del(item.id, store)
      sent++
    } catch {
      const attempts = (item.attempts ?? 0) + 1
      if (attempts >= MAX_ATTEMPTS) await del(item.id, store)
      else await set(item.id, { ...item, attempts }, store)
      break
    }
  }
  return sent
}
