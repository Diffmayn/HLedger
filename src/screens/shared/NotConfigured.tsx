import { Settings } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { t } from '@/i18n'

export function NotConfigured() {
  return (
    <EmptyState icon={<Settings />} title={t('notConfigured')} className="h-full">
      <code className="rounded bg-surface-2 px-2 py-1 text-sm">.env.local</code>
    </EmptyState>
  )
}
