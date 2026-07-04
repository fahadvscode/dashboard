import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Project Presentation',
  description: 'Create and share branded project presentations',
  robots: { index: false, follow: false },
}

export default function ProjectPresentationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
