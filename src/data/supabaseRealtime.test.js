import { describe, expect, it, vi } from 'vitest'
import { startSupabaseRealtimeQuery } from './supabaseRealtime'

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function createSupabaseMock() {
  const sourceQuery = { tag: 'query' }
  const channel = { tag: 'channel' }
  let changeHandler = null

  const supabaseClient = {
    from: vi.fn(() => sourceQuery),
    channel: vi.fn(() => ({
      on: vi.fn((eventName, filter, callback) => {
        changeHandler = callback
        return {
          subscribe: vi.fn(() => channel)
        }
      })
    })),
    removeChannel: vi.fn()
  }

  return {
    supabaseClient,
    sourceQuery,
    channel,
    getChangeHandler: () => changeHandler
  }
}

describe('startSupabaseRealtimeQuery', () => {
  it('loads immediately and reloads when a realtime event arrives', async () => {
    const { supabaseClient, sourceQuery, getChangeHandler } = createSupabaseMock()
    const runQuery = vi
      .fn()
      .mockResolvedValueOnce({ data: ['first'], error: null })
      .mockResolvedValueOnce({ data: ['second'], error: null })
    const onData = vi.fn()

    const stop = startSupabaseRealtimeQuery({
      supabaseClient,
      channelName: 'guestbook-messages',
      table: 'messages',
      runQuery,
      onData
    })

    await flushPromises()
    expect(runQuery).toHaveBeenCalledWith(sourceQuery)
    expect(onData).toHaveBeenCalledWith(['first'])

    getChangeHandler()()
    await flushPromises()
    expect(onData).toHaveBeenLastCalledWith(['second'])

    stop()
    expect(supabaseClient.removeChannel).toHaveBeenCalledTimes(1)
  })

  it('does not push data after cleanup if an in-flight query resolves late', async () => {
    const { supabaseClient } = createSupabaseMock()
    const onData = vi.fn()
    let resolveQuery
    const runQuery = vi.fn(() => new Promise((resolve) => {
      resolveQuery = resolve
    }))

    const stop = startSupabaseRealtimeQuery({
      supabaseClient,
      channelName: 'guestbook-settings',
      table: 'settings',
      runQuery,
      onData
    })

    stop()
    resolveQuery({ data: [{ key: 'a' }], error: null })
    await flushPromises()

    expect(onData).not.toHaveBeenCalled()
  })

  it('forwards query errors to the provided handler', async () => {
    const { supabaseClient } = createSupabaseMock()
    const onData = vi.fn()
    const onError = vi.fn()
    const failure = new Error('load failed')

    startSupabaseRealtimeQuery({
      supabaseClient,
      channelName: 'guestbook-reactions',
      table: 'reactions',
      runQuery: vi.fn().mockResolvedValue({ data: null, error: failure }),
      onData,
      onError
    })

    await flushPromises()

    expect(onError).toHaveBeenCalledWith(failure)
    expect(onData).not.toHaveBeenCalled()
  })
})