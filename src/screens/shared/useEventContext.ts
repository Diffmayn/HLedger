import { useOutletContext } from 'react-router'
import type { EventContext } from './EventLayout'

export function useEventContext(): EventContext {
  return useOutletContext<EventContext>()
}
