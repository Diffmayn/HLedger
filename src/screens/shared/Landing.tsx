import { Link } from 'react-router'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export function Landing() {
  return (
    <EmptyState icon={<BookOpen />} title="Guestbook" className="h-full">
      <p className="mb-6">Open an event link, or sign in to create one.</p>
      <Button asChild>
        <Link to="/host">Host sign-in</Link>
      </Button>
    </EmptyState>
  )
}
