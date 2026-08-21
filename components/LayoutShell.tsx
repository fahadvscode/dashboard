'use client'

import { usePathname } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import MobileDashboard from '@/components/MobileDashboard'
import MobileBottomNav from '@/components/MobileBottomNav'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = pathname.startsWith('/present')
  const isHome = pathname === '/'

  if (isPublicRoute) {
    return <>{children}</>
  }

  return (
    <AuthGuard>
      {isHome ? (
        <MobileDashboard />
      ) : (
        <div className="flex flex-col h-dvh min-h-0 bg-[#F2F2F7]">
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
          <MobileBottomNav />
        </div>
      )}
    </AuthGuard>
  )
}
