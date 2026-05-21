'use client'

import { usePathname } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/Sidebar'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = pathname.startsWith('/present')

  if (isPublicRoute) {
    return <>{children}</>
  }

  return (
    <AuthGuard>
      <div className="flex h-dvh min-h-0 bg-gray-50">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}
