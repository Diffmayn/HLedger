import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon,
  title,
  children,
  className,
}: {
  icon?: ReactNode
  title: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 p-10 text-center', className)}>
      {icon ? <div className="text-accent [&>svg]:size-12">{icon}</div> : null}
      <h2 className="text-2xl">{title}</h2>
      {children ? <div className="max-w-md text-ink-2">{children}</div> : null}
    </div>
  )
}
