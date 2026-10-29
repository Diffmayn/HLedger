import { Dialog, DialogContent } from '@/components/ui/Dialog'
import type { Entry } from '@/types/domain'
import type { ReactionSummary } from '@/data/reactions'
import { EntryCard } from './EntryCard'

export function EntryDialog({
  entry,
  reactions,
  onClose,
  onReact,
}: {
  entry: Entry | null
  reactions?: ReactionSummary
  onClose: () => void
  onReact?: (entry: Entry, emoji: string, active: boolean) => void
}) {
  return (
    <Dialog open={Boolean(entry)} onOpenChange={(o) => !o && onClose()}>
      {entry && (
        <DialogContent title={entry.authorName || 'Guest entry'} size="lg" className="p-2 sm:p-4">
          <EntryCard entry={entry} reactions={reactions} size="large" autoplayVideo onReact={onReact} className="rotate-0" />
        </DialogContent>
      )}
    </Dialog>
  )
}
