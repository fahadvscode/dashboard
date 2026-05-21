import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Project Presentation',
  description: 'View project amenities and location details',
}

export default function PresentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
