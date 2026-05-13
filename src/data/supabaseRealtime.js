let channelCounter = 0

export function startSupabaseRealtimeQuery({
  supabaseClient,
  channelName,
  table,
  runQuery,
  onData,
  onError = () => {}
}) {
  let cancelled = false

  const load = async () => {
    const { data, error } = await runQuery(supabaseClient.from(table))

    if (error) {
      onError(error)
      return
    }

    if (!cancelled) {
      onData(data)
    }
  }

  void load()

  const channel = supabaseClient
    .channel(`${channelName}-${++channelCounter}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      () => {
        void load()
      }
    )
    .subscribe()

  return () => {
    cancelled = true
    supabaseClient.removeChannel(channel)
  }
}