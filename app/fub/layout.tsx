import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book Meeting',
  robots: { index: false, follow: false },
}

export default function FubLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="text/javascript" src="https://eia.followupboss.com/embeddedApps-v1.0.1.js" />
      {children}
    </>
  )
}
