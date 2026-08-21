'use client'

import { useRouter } from 'next/navigation'
import { Home, ArrowLeft } from 'lucide-react'

const TINT = '#0C5C35'
const SEPARATOR = '#E5E5EA'
const font = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif" }

export default function MobileBottomNav() {
  const router = useRouter()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(249,249,249,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `0.5px solid ${SEPARATOR}`,
        padding: '10px 20px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      }}
    >
      <button
        onClick={() => router.back()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 12px',
          borderRadius: 10,
        }}
      >
        <ArrowLeft size={18} color={TINT} strokeWidth={2.4} />
        <span style={{ ...font, fontSize: 15, fontWeight: 600, color: TINT }}>Back</span>
      </button>
      <button
        onClick={() => router.push('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 12px',
          borderRadius: 10,
        }}
      >
        <Home size={18} color={TINT} strokeWidth={2.2} />
        <span style={{ ...font, fontSize: 15, fontWeight: 600, color: TINT }}>Home</span>
      </button>
    </div>
  )
}
