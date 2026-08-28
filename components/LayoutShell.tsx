'use client'

import { usePathname } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import MobileDashboard from '@/components/MobileDashboard'
import MobileBottomNav, { InnerTopBar } from '@/components/MobileBottomNav'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = pathname.startsWith('/present') || pathname.startsWith('/fub')
  const isHome = pathname === '/'

  if (isPublicRoute) {
    return <>{children}</>
  }

  return (
    <AuthGuard>
      {isHome ? (
        <MobileDashboard />
      ) : (
        <div className="flex flex-col h-[100dvh] min-h-0 bg-[#F2F2F7]">
          <InnerTopBar />
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            {children}
          </main>
          <MobileBottomNav />
        </div>
      )}
    </AuthGuard>
  )
}
