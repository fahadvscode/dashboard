'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Home, MoreHorizontal } from 'lucide-react'

const TINT = '#0C5C35'
const SEPARATOR = '#E5E5EA'
const font = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif" }

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '10px 12px',
  minHeight: 44,
  minWidth: 44,
  borderRadius: 10,
  WebkitTapHighlightColor: 'transparent',
}

export default function MobileBottomNav() {
  const router = useRouter()

  const items = [
    { label: 'Back', icon: ArrowLeft, onClick: () => router.back() },
    { label: 'Home', icon: Home, onClick: () => router.push('/') },
    { label: 'More', icon: MoreHorizontal, onClick: () => router.push('/?tab=more') },
  ]

  return (
    <nav
      aria-label="Page navigation"
      style={{
        display: 'flex',
        background: 'rgba(249,249,249,0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `0.5px solid ${SEPARATOR}`,
        paddingTop: 6,
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', width: '100%', maxWidth: 560 }}>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                padding: '6px 0',
                minHeight: 48,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Icon size={22} color={TINT} strokeWidth={2.3} />
              <span style={{ ...font, fontSize: 11, fontWeight: 600, color: TINT }}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function InnerTopBar() {
  const router = useRouter()

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `0.5px solid ${SEPARATOR}`,
        padding: '4px 6px',
        flexShrink: 0,
      }}
    >
      <button type="button" onClick={() => router.back()} style={btnStyle} aria-label="Back">
        <ArrowLeft size={20} color={TINT} strokeWidth={2.4} />
        <span style={{ ...font, fontSize: 17, fontWeight: 600, color: TINT }}>Back</span>
      </button>
      <button
        type="button"
        onClick={() => router.push('/?tab=more')}
        style={btnStyle}
        aria-label="More"
      >
        <span style={{ ...font, fontSize: 17, fontWeight: 600, color: TINT }}>More</span>
        <MoreHorizontal size={20} color={TINT} strokeWidth={2.2} />
      </button>
    </header>
  )
}
