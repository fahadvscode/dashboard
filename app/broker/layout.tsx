import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Broker Guide',
  description: 'Site and sales office details for brokers',
  robots: { index: false, follow: false },
}

export default function BrokerLayout({ children }: { children: React.ReactNode }) {
  return children
}
