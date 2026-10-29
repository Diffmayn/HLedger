import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from './toastStore'

export { toast, useToast } from './toastStore'

const icons = { success: CheckCircle2, error: AlertCircle, info: Info }

export function Toaster() {
  const { toasts, dismiss } = useToast()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 safe-pb">
      {toasts.map((t) => {
        const Icon = icons[t.kind]
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-ink px-4 py-3 text-bg shadow-pop animate-rise',
              t.kind === 'error' && 'bg-danger text-white',
              t.kind === 'success' && 'bg-success text-white',
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className="text-sm font-medium">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="ml-1 rounded-full p-1 opacity-70 hover:opacity-100" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
