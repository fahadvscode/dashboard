'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home, Calendar, Flame, Plus, Phone, Mail, Building2, Video,
  PhoneCall, Check, X, Clock, ChevronRight, User,
  Search, CheckSquare, UploadCloud, Users, FolderOpen, Sparkles,
  Image, MessageSquare, Link2, Settings2, LogOut, MoreHorizontal,
  Radio, Shuffle, MousePointerClick, Zap, MessageCircle,
} from 'lucide-react'
import { logout } from '@/lib/auth'

const BG = '#F2F2F7'
const CARD = '#FFFFFF'
const LABEL = '#1C1C1E'
const SECONDARY = '#8E8E93'
const SEPARATOR = '#E5E5EA'
const TINT = '#0C5C35'
const TINT_SOFT = '#E1EDE6'
const GOLD = '#C9A84C'
const GOLD_SOFT = '#F6EFDC'
const DESTRUCTIVE = '#FF3B30'

const font = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif" }

const TODAY_MOCK = [
  { id: 1, time: '1:00 PM', name: 'Ali Khalil', phone: '2267506270', brand: 'FJ', type: 'office visit', project: '6071 Fourth Line' },
  { id: 2, time: '3:00 PM', name: 'Priya Sharma', phone: '6475559981', brand: 'Precon Factory', type: 'zoom/google meet', project: 'The Enclave by Sundial' },
  { id: 3, time: '5:30 PM', name: 'Marcus Reid', phone: '9056671122', brand: 'FJ', type: 'phone call', project: 'Skyline Towns' },
]

const HOT_LEADS_MOCK = [
  { id: 1, name: 'Ali Khalil', phone: '2267506270', email: 'aliahmed18@gmail.com', project: '6071 Fourth Line Townhomes', brand: 'Precon Factory' },
  { id: 2, name: 'Nadia Osei', phone: '6475551234', email: 'nadia.o@gmail.com', project: 'The Enclave by Sundial', brand: 'FJ' },
]

const ALL_BOOKINGS: Record<string, Array<{ id: number; time: string; date: string; name: string; type: string; project: string }>> = {
  FJ: [
    { id: 1, time: '1:00 PM', date: 'Today', name: 'Ali Khalil', type: 'office visit', project: '6071 Fourth Line' },
    { id: 2, time: '5:30 PM', date: 'Today', name: 'Marcus Reid', type: 'phone call', project: 'Skyline Towns' },
    { id: 3, time: '11:00 AM', date: 'Tomorrow', name: 'Sana Malik', type: 'builder visit', project: 'Meadowvale Commons' },
  ],
  Precon: [
    { id: 4, time: '3:00 PM', date: 'Today', name: 'Priya Sharma', type: 'zoom/google meet', project: 'The Enclave by Sundial' },
    { id: 5, time: '2:00 PM', date: 'Tomorrow', name: 'Devon Clarke', type: 'office visit', project: 'Caledon Ridge' },
  ],
  Lowrise: [
    { id: 6, time: '10:30 AM', date: 'Tomorrow', name: 'Ken Wu', type: 'builder visit', project: 'Brampton Heights' },
  ],
  Interview: [
    { id: 7, time: '4:00 PM', date: 'Today', name: 'Sarah Kim', type: 'phone call', project: 'Agent Interview' },
  ],
}

const LEAD_SOURCES = [
  { key: 'FJ Leads', count: 12 },
  { key: 'Precon Factory Leads', count: 8 },
  { key: 'Precon Website Leads', count: 5 },
  { key: 'GTA Lowrise Leads', count: 3 },
  { key: 'Rental Leads', count: 2 },
  { key: 'Landing Page Leads', count: 6 },
]

const MORE_SECTIONS = [
  {
    heading: 'Properties',
    items: [
      { label: 'Task Manager', icon: CheckSquare, tint: '#FF9500', href: 'https://task-management-app-flame-seven.vercel.app/', external: true },
      { label: 'Canada Properties', icon: Building2, tint: '#007AFF', href: '/' },
      { label: 'Upload Project', icon: UploadCloud, tint: '#5856D6', href: '/project-upload' },
      { label: 'Project Presentation', icon: Users, tint: '#AF52DE', href: '/project-presentation' },
      { label: 'Project Collections', icon: FolderOpen, tint: '#FF9500', href: '/collections' },
    ],
  },
  {
    heading: 'Insights & Media',
    items: [
      { label: 'AI Lead Insights', icon: Sparkles, tint: '#5856D6', href: '/ai-insights' },
      { label: 'Media Upload', icon: Image, tint: '#30B0C7', href: '/media-upload' },
      { label: 'SMS Conversations', icon: MessageSquare, tint: '#34C759', href: '/conversations' },
    ],
  },
  {
    heading: 'Bookings',
    items: [
      { label: 'FJ Bookings', icon: Calendar, tint: TINT, href: '/fj-bookings' },
      { label: 'Fahad Sells Interview Bookings', icon: Calendar, tint: TINT, href: '/interview-bookings' },
      { label: 'Precon Factory Bookings', icon: Calendar, tint: GOLD, href: '/precon-bookings' },
      { label: 'GTA Lowrise Bookings', icon: Calendar, tint: GOLD, href: '/gta-lowrise-bookings' },
    ],
  },
  {
    heading: 'Leads',
    items: [
      { label: 'FJ Leads', icon: Mail, tint: TINT, href: '/fj-leads' },
      { label: 'Precon Factory Leads', icon: Mail, tint: GOLD, href: '/precon-leads' },
      { label: 'Precon Factory Website Leads', icon: Mail, tint: GOLD, href: '/precon-factory-website-leads' },
      { label: 'GTA Lowrise Leads', icon: Mail, tint: '#FF9500', href: '/gta-lowrise-leads' },
      { label: 'Rental Leads', icon: Mail, tint: '#30B0C7', href: '/rental-leads' },
      { label: 'Landing Pages Leads', icon: Mail, tint: '#AF52DE', href: '/landing-pages-leads' },
    ],
  },
  {
    heading: 'Tools',
    items: [
      { label: 'Landing Page Sources', icon: Link2, tint: '#8E8E93', href: '/landing-page-sources' },
      { label: 'Tools & Links', icon: Settings2, tint: '#8E8E93', href: '#' },
      { label: 'Logout', icon: LogOut, tint: DESTRUCTIVE, href: '#logout' },
    ],
  },
]

const TEAM = [
  { id: 1, name: 'Fahad Javed', initials: 'FJ', status: 'available' as const, tint: TINT },
  { id: 2, name: 'Sana Malik', initials: 'SM', status: 'available' as const, tint: GOLD },
  { id: 3, name: 'Marcus Reid', initials: 'MR', status: 'busy' as const, tint: '#007AFF' },
  { id: 4, name: 'Priya Sharma', initials: 'PS', status: 'available' as const, tint: '#AF52DE' },
  { id: 5, name: 'Devon Clarke', initials: 'DC', status: 'offline' as const, tint: '#8E8E93' },
]

const STATUS_META: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: '#34C759' },
  busy: { label: 'Busy', color: '#FF9500' },
  offline: { label: 'Offline', color: '#8E8E93' },
}

const APPT_TYPES = [
  { key: 'office visit', label: 'Office Visit', icon: Building2 },
  { key: 'builder visit', label: 'Builder Visit', icon: Building2 },
  { key: 'phone call', label: 'Phone Call', icon: PhoneCall },
  { key: 'zoom/google meet', label: 'Zoom / Meet', icon: Video },
]

function typeIcon(type: string) {
  const found = APPT_TYPES.find((t) => t.key === type)
  return found ? found.icon : Calendar
}

function BrandTag({ brand }: { brand: string }) {
  const isFJ = brand === 'FJ'
  return (
    <span
      style={{
        ...font,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.2,
        padding: '3px 9px',
        borderRadius: 999,
        color: isFJ ? TINT : '#8a6d1f',
        background: isFJ ? TINT_SOFT : GOLD_SOFT,
      }}
    >
      {brand}
    </span>
  )
}

function NavBar({ title, subtitle, rightIcon: RightIcon, onRight }: {
  title: string
  subtitle?: string
  rightIcon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
  onRight?: () => void
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.86)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `0.5px solid ${SEPARATOR}`,
        padding: '12px 20px 12px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ ...font, fontSize: 28, fontWeight: 700, color: LABEL, letterSpacing: 0.2 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ ...font, fontSize: 13, color: SECONDARY, marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
        {RightIcon && (
          <button
            onClick={onRight}
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: TINT_SOFT,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
              cursor: 'pointer',
            }}
          >
            <RightIcon size={18} color={TINT} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </div>
  )
}

function SectionHeader({ children }: { children: string }) {
  return (
    <div style={{ ...font, fontSize: 12.5, fontWeight: 600, color: SECONDARY, letterSpacing: 0.3, margin: '22px 4px 7px' }}>
      {children.toUpperCase()}
    </div>
  )
}

function GroupedList({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: CARD, borderRadius: 12, overflow: 'hidden', boxShadow: '0 0.5px 0 rgba(0,0,0,0.04)' }}>
      {children}
    </div>
  )
}

function Row({ leading, title, subtitle, trailing, last, onClick }: {
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: string
  trailing?: React.ReactNode
  last?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
        borderBottom: last ? 'none' : `0.5px solid ${SEPARATOR}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {leading}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...font, fontSize: 15.5, fontWeight: 500, color: LABEL }}>{title}</div>
        {subtitle && <div style={{ ...font, fontSize: 12.5, color: SECONDARY, marginTop: 1 }}>{subtitle}</div>}
      </div>
      {trailing}
    </div>
  )
}

function IconChip({ Icon, tint }: { Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; tint: string }) {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: tint,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={16} color="#fff" strokeWidth={2.2} />
    </div>
  )
}

function CircleIconBtn({ Icon, href, filled }: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
  href: string
  filled?: boolean
}) {
  return (
    <a
      href={href}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 32,
        height: 32,
        borderRadius: 999,
        background: filled ? TINT : TINT_SOFT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        flexShrink: 0,
      }}
    >
      <Icon size={15} color={filled ? '#fff' : TINT} strokeWidth={2.4} />
    </a>
  )
}

function TabBar({ active, setActive }: { active: string; setActive: (key: string) => void }) {
  const tabs = [
    { key: 'home', label: 'Today', icon: Home },
    { key: 'bookings', label: 'Bookings', icon: Calendar },
    { key: 'leads', label: 'Leads', icon: Flame },
    { key: 'page', label: 'Page', icon: Radio },
    { key: 'more', label: 'More', icon: MoreHorizontal },
  ]
  return (
    <div
      style={{
        display: 'flex',
        background: 'rgba(249,249,249,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `0.5px solid ${SEPARATOR}`,
        paddingTop: 8,
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
    >
      {tabs.map((t) => {
        const Icon = t.icon
        const isActive = active === t.key
        return (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            style={{ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 0', cursor: 'pointer' }}
          >
            <Icon size={23} color={isActive ? TINT : '#9a9a9e'} strokeWidth={isActive ? 2.3 : 1.8} fill={isActive && t.key === 'leads' ? TINT : 'none'} />
            <span style={{ ...font, fontSize: 10, fontWeight: isActive ? 600 : 500, color: isActive ? TINT : '#9a9a9e' }}>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---------- Today Tab ----------
function HomeTab({ openAdd }: { openAdd: () => void }) {
  const [todayData, setTodayData] = useState(TODAY_MOCK)
  const [hotLeads, setHotLeads] = useState(HOT_LEADS_MOCK)

  useEffect(() => {
    fetch('/api/hot-leads')
      .then(res => res.json())
      .then(data => {
        if (data.leads && data.leads.length > 0) {
          setHotLeads(data.leads.slice(0, 2).map((l: { id?: number; name?: string; phone?: string; email?: string; project_interested?: string; brand?: string }, i: number) => ({
            id: l.id || i + 1,
            name: l.name || 'Unknown',
            phone: l.phone || '',
            email: l.email || '',
            project: l.project_interested || '',
            brand: l.brand || 'FJ',
          })))
        }
      })
      .catch(() => {})
  }, [])

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div>
      <NavBar title="Today" subtitle={`${todayData.length} appointments · ${dateStr}`} rightIcon={Plus} onRight={openAdd} />
      <div style={{ padding: '0 16px 110px' }}>
        <SectionHeader>Schedule</SectionHeader>
        <GroupedList>
          {todayData.map((a, i) => {
            const Icon = typeIcon(a.type)
            return (
              <Row
                key={a.id}
                last={i === todayData.length - 1}
                leading={<IconChip Icon={Icon} tint={a.brand === 'FJ' ? TINT : GOLD} />}
                title={a.name}
                subtitle={`${a.project} · ${a.time}`}
                trailing={
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <BrandTag brand={a.brand} />
                    <CircleIconBtn Icon={Phone} href={`tel:${a.phone}`} filled />
                  </div>
                }
              />
            )
          })}
        </GroupedList>

        <SectionHeader>Hot Lead</SectionHeader>
        {hotLeads.length > 0 && (
          <GroupedList>
            <div style={{ padding: '14px 14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, background: DESTRUCTIVE }} />
                <span style={{ ...font, fontSize: 16, fontWeight: 600, color: LABEL }}>{hotLeads[0].name}</span>
              </div>
              <div style={{ ...font, fontSize: 13, color: SECONDARY, marginBottom: 14, marginLeft: 16 }}>
                {hotLeads[0].project}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <a href={`tel:${hotLeads[0].phone}`} style={{ flex: 1, background: TINT, borderRadius: 10, padding: '11px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textDecoration: 'none' }}>
                  <Phone size={15} color="#fff" strokeWidth={2.2} />
                  <span style={{ ...font, color: '#fff', fontWeight: 600, fontSize: 14.5 }}>Call</span>
                </a>
                <a href={`mailto:${hotLeads[0].email}`} style={{ flex: 1, background: TINT_SOFT, borderRadius: 10, padding: '11px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textDecoration: 'none' }}>
                  <Mail size={15} color={TINT} strokeWidth={2.2} />
                  <span style={{ ...font, color: TINT, fontWeight: 600, fontSize: 14.5 }}>Email</span>
                </a>
              </div>
            </div>
          </GroupedList>
        )}
      </div>
    </div>
  )
}

// ---------- Bookings Tab ----------
function SegmentedControl({ options, value, onChange }: {
  options: Array<{ key: string; label: string }>
  value: string
  onChange: (key: string) => void
}) {
  return (
    <div style={{ display: 'flex', background: '#E4E4E8', borderRadius: 9, padding: 2, margin: '4px 16px 18px' }}>
      {options.map((o) => {
        const active = value === o.key
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: 7,
              padding: '6px 0',
              background: active ? '#fff' : 'transparent',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
              ...font,
              fontWeight: 600,
              fontSize: 12.5,
              color: active ? LABEL : SECONDARY,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function BookingsTab() {
  const [brand, setBrand] = useState('FJ')
  const options = [
    { key: 'FJ', label: 'FJ' },
    { key: 'Precon', label: 'Precon' },
    { key: 'Lowrise', label: 'Lowrise' },
    { key: 'Interview', label: 'Interview' },
  ]
  const list = ALL_BOOKINGS[brand] || []
  return (
    <div>
      <NavBar title="Bookings" subtitle="Every calendar, one screen" />
      <SegmentedControl options={options} value={brand} onChange={setBrand} />
      <div style={{ padding: '0 16px 110px' }}>
        <GroupedList>
          {list.length === 0 && (
            <div style={{ padding: '26px 14px', textAlign: 'center', ...font, fontSize: 13.5, color: SECONDARY }}>
              Nothing booked here yet.
            </div>
          )}
          {list.map((b, i) => {
            const Icon = typeIcon(b.type)
            return (
              <Row
                key={b.id}
                last={i === list.length - 1}
                leading={<IconChip Icon={Icon} tint={TINT} />}
                title={b.name}
                subtitle={b.project}
                trailing={
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...font, fontWeight: 600, fontSize: 13.5, color: LABEL }}>{b.date}</div>
                    <div style={{ ...font, fontSize: 12, color: SECONDARY }}>{b.time}</div>
                  </div>
                }
              />
            )
          })}
        </GroupedList>
      </div>
    </div>
  )
}

// ---------- Leads Tab ----------
function LeadsTab() {
  return (
    <div>
      <NavBar title="Leads" subtitle="6 inboxes, one list" />
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#E4E4E8', borderRadius: 10, padding: '9px 12px', marginTop: 4, marginBottom: 16 }}>
          <Search size={16} color={SECONDARY} />
          <span style={{ ...font, fontSize: 14.5, color: SECONDARY }}>Search leads</span>
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 18, marginBottom: 4, WebkitOverflowScrolling: 'touch' }}>
          {LEAD_SOURCES.map((s) => (
            <div
              key={s.key}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: CARD,
                borderRadius: 999,
                padding: '7px 12px 7px 13px',
                border: `0.5px solid ${SEPARATOR}`,
              }}
            >
              <span style={{ ...font, fontSize: 12.5, fontWeight: 500, color: LABEL, whiteSpace: 'nowrap' }}>{s.key}</span>
              <span
                style={{
                  ...font,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  background: TINT,
                  borderRadius: 999,
                  minWidth: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 5px',
                }}
              >
                {s.count}
              </span>
            </div>
          ))}
        </div>

        <SectionHeader>Needs a call today</SectionHeader>
        <GroupedList>
          {HOT_LEADS_MOCK.map((l, i) => (
            <Row
              key={l.id}
              last={i === HOT_LEADS_MOCK.length - 1}
              leading={<div style={{ width: 8, height: 8, borderRadius: 999, background: DESTRUCTIVE, marginLeft: 4, marginRight: 3 }} />}
              title={l.name}
              subtitle={l.project}
              trailing={
                <div style={{ display: 'flex', gap: 8 }}>
                  <CircleIconBtn Icon={Phone} href={`tel:${l.phone}`} filled />
                  <CircleIconBtn Icon={Mail} href={`mailto:${l.email}`} />
                </div>
              }
            />
          ))}
        </GroupedList>
      </div>
      <div style={{ height: 110 }} />
    </div>
  )
}

// ---------- More Tab ----------
function MoreTab() {
  const router = useRouter()

  const handleItemClick = (item: { label: string; href: string; external?: boolean }) => {
    if (item.href === '#logout') {
      logout()
      window.location.reload()
      return
    }
    if (item.external) {
      window.open(item.href, '_blank', 'noopener,noreferrer')
      return
    }
    if (item.href && item.href !== '#') {
      router.push(item.href)
    }
  }

  return (
    <div>
      <NavBar title="More" subtitle="Everything from the old menu" />
      <div style={{ padding: '0 16px 110px' }}>
        {MORE_SECTIONS.map((section) => (
          <div key={section.heading}>
            <SectionHeader>{section.heading}</SectionHeader>
            <GroupedList>
              {section.items.map((item, idx) => (
                <Row
                  key={item.label}
                  last={idx === section.items.length - 1}
                  leading={<IconChip Icon={item.icon} tint={item.tint} />}
                  title={<span style={{ color: item.label === 'Logout' ? DESTRUCTIVE : LABEL }}>{item.label}</span>}
                  trailing={<ChevronRight size={17} color="#c7c7cc" />}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </GroupedList>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Pager Tab ----------
function Avatar({ member, size = 44 }: { member: { initials: string; status: string; tint: string }; size?: number }) {
  const meta = STATUS_META[member.status]
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          background: member.tint,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ ...font, color: '#fff', fontWeight: 700, fontSize: size * 0.36 }}>{member.initials}</span>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: 999,
          background: meta.color,
          border: '2px solid #fff',
        }}
      />
    </div>
  )
}

function PageToast({ toast }: { toast: { name: string; detail: string } | null }) {
  if (!toast) return null
  return (
    <div
      style={{
        position: 'absolute',
        top: 54,
        left: 14,
        right: 14,
        zIndex: 50,
        background: 'rgba(28,28,30,0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        animation: 'pagerSlideDown 0.25s ease-out',
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 999, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Radio size={15} color={TINT} strokeWidth={2.4} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ ...font, fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Paging {toast.name}</div>
        <div style={{ ...font, fontSize: 11.5, color: 'rgba(255,255,255,0.7)' }}>{toast.detail}</div>
      </div>
    </div>
  )
}

function PagerButton({ onClick, pulsing }: { onClick: () => void; pulsing: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 96,
        height: 96,
        borderRadius: 999,
        background: `linear-gradient(155deg, ${TINT} 0%, #0a4a2b 100%)`,
        border: `3px solid ${GOLD}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        margin: '0 auto',
        animation: pulsing ? 'pagerPulse 0.7s ease-out' : 'none',
      }}
    >
      <Radio size={34} color="#fff" strokeWidth={2} />
    </button>
  )
}

function PageTab() {
  const [mode, setMode] = useState('roundRobin')
  const [queueIndex, setQueueIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [log, setLog] = useState([
    { id: 1, name: 'Marcus Reid', time: '11:42 AM', via: 'Round robin' },
    { id: 2, name: 'Sana Malik', time: '10:15 AM', via: 'Picked' },
  ])
  const [toast, setToast] = useState<{ name: string; detail: string } | null>(null)
  const [pulsing, setPulsing] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  const roster = TEAM
  const nextUp = roster[queueIndex % roster.length]
  const available = roster.filter((m) => m.status === 'available')
  const selectedMember = roster.find((m) => m.id === selectedId)

  const firePage = (member: typeof TEAM[number], via: string) => {
    setLog((l) => [{ id: Date.now(), name: member.name, time: 'Just now', via }, ...l].slice(0, 6))
    setToast({ name: member.name, detail: 'In-app alert sent · SMS coming soon' })
    setPulsing(true)
    setTimeout(() => setPulsing(false), 700)
    if (mode === 'roundRobin') setQueueIndex((i) => (i + 1) % roster.length)
    if (mode === 'pick') setSelectedId(null)
  }

  const modes = [
    { key: 'roundRobin', label: 'Round Robin', icon: Shuffle },
    { key: 'pick', label: 'Pick Person', icon: MousePointerClick },
    { key: 'available', label: 'Available Now', icon: Zap },
  ]

  return (
    <div style={{ position: 'relative' }}>
      <PageToast toast={toast} />
      <NavBar title="Page" subtitle="Walkie-talkie style team paging" />

      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 20, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {modes.map((m) => {
            const Icon = m.icon
            const active = mode === m.key
            return (
              <button
                key={m.key}
                onClick={() => { setMode(m.key); setSelectedId(null) }}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: 'none',
                  borderRadius: 999,
                  padding: '9px 14px',
                  background: active ? TINT : '#E4E4E8',
                  cursor: 'pointer',
                }}
              >
                <Icon size={14} color={active ? '#fff' : SECONDARY} strokeWidth={2.2} />
                <span style={{ ...font, fontSize: 12.5, fontWeight: 600, color: active ? '#fff' : SECONDARY, whiteSpace: 'nowrap' }}>{m.label}</span>
              </button>
            )
          })}
        </div>

        {mode === 'roundRobin' && (
          <div style={{ background: CARD, borderRadius: 18, padding: '26px 20px', textAlign: 'center', border: `0.5px solid ${SEPARATOR}`, marginBottom: 22 }}>
            <div style={{ ...font, fontSize: 11.5, fontWeight: 600, color: SECONDARY, letterSpacing: 0.5, marginBottom: 14 }}>
              UP NEXT IN ROTATION
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <Avatar member={nextUp} size={64} />
            </div>
            <div style={{ ...font, fontSize: 18, fontWeight: 700, color: LABEL, marginBottom: 2 }}>{nextUp.name}</div>
            <div style={{ ...font, fontSize: 12.5, color: STATUS_META[nextUp.status].color, fontWeight: 600, marginBottom: 22 }}>
              {STATUS_META[nextUp.status].label}
            </div>
            <PagerButton onClick={() => firePage(nextUp, 'Round robin')} pulsing={pulsing} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 18 }}>
              {roster.map((m, i) => (
                <div key={m.id} style={{ width: 6, height: 6, borderRadius: 999, background: i === queueIndex % roster.length ? TINT : SEPARATOR }} />
              ))}
            </div>
          </div>
        )}

        {mode === 'pick' && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {roster.map((m) => {
                const selected = selectedId === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    style={{
                      background: CARD,
                      border: selected ? `1.5px solid ${TINT}` : `0.5px solid ${SEPARATOR}`,
                      borderRadius: 14,
                      padding: '14px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <Avatar member={m} size={44} />
                    <span style={{ ...font, fontSize: 12.5, fontWeight: 600, color: LABEL, textAlign: 'center' }}>{m.name}</span>
                    <span style={{ ...font, fontSize: 10.5, color: STATUS_META[m.status].color, fontWeight: 600 }}>{STATUS_META[m.status].label}</span>
                  </button>
                )
              })}
            </div>
            <button
              disabled={!selectedMember}
              onClick={() => selectedMember && firePage(selectedMember, 'Picked')}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: 14,
                padding: '15px 0',
                background: selectedMember ? TINT : '#E4E4E8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: selectedMember ? 'pointer' : 'not-allowed',
              }}
            >
              <Radio size={17} color={selectedMember ? '#fff' : '#a9a9ad'} strokeWidth={2.2} />
              <span style={{ ...font, fontWeight: 700, fontSize: 15, color: selectedMember ? '#fff' : '#a9a9ad' }}>
                {selectedMember ? `Page ${selectedMember.name.split(' ')[0]}` : 'Pick someone first'}
              </span>
            </button>
          </div>
        )}

        {mode === 'available' && (
          <div style={{ marginBottom: 22 }}>
            <SectionHeader>Available now</SectionHeader>
            <GroupedList>
              {available.length === 0 && (
                <div style={{ padding: '24px 14px', textAlign: 'center', ...font, fontSize: 13.5, color: SECONDARY }}>
                  Nobody&apos;s marked available right now.
                </div>
              )}
              {available.map((m, i) => (
                <Row
                  key={m.id}
                  last={i === available.length - 1}
                  leading={<Avatar member={m} size={38} />}
                  title={m.name}
                  subtitle={STATUS_META[m.status].label}
                  trailing={
                    <button
                      onClick={() => firePage(m, 'Available now')}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: TINT, borderRadius: 999, padding: '7px 12px', cursor: 'pointer' }}
                    >
                      <Radio size={13} color="#fff" strokeWidth={2.2} />
                      <span style={{ ...font, fontSize: 12.5, fontWeight: 700, color: '#fff' }}>Page</span>
                    </button>
                  }
                />
              ))}
            </GroupedList>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: GOLD_SOFT, borderRadius: 12, padding: '10px 12px', marginBottom: 22 }}>
          <MessageCircle size={15} color="#8a6d1f" style={{ flexShrink: 0 }} />
          <span style={{ ...font, fontSize: 11.5, color: '#8a6d1f', lineHeight: 1.35 }}>
            Right now paging sends an in-app alert only. Wire this to Twilio and it&apos;ll also text the person&apos;s phone the moment you tap Page.
          </span>
        </div>

        <SectionHeader>Recent pages</SectionHeader>
        <GroupedList>
          {log.map((entry, i) => (
            <Row
              key={entry.id}
              last={i === log.length - 1}
              leading={<IconChip Icon={Radio} tint={TINT} />}
              title={entry.name}
              subtitle={entry.via}
              trailing={<span style={{ ...font, fontSize: 12.5, color: SECONDARY }}>{entry.time}</span>}
            />
          ))}
        </GroupedList>
      </div>
      <div style={{ height: 110 }} />
      <style>{`@keyframes pagerSlideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } } @keyframes pagerPulse { 0% { box-shadow: 0 0 0 0 rgba(12,92,53,0.45); } 100% { box-shadow: 0 0 0 22px rgba(12,92,53,0); } }`}</style>
    </div>
  )
}

// ---------- Add Booking Sheet ----------
function SheetNav({ title, leftLabel, onLeft, rightLabel, rightEnabled, onRight }: {
  title: string
  leftLabel: string
  onLeft: () => void
  rightLabel: string
  rightEnabled: boolean
  onRight: () => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 4 }}>
        <div style={{ width: 36, height: 5, borderRadius: 999, background: '#D1D1D6' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 12px' }}>
        <button onClick={onLeft} style={{ background: 'none', border: 'none', ...font, fontSize: 16, color: TINT, cursor: 'pointer', padding: 4 }}>
          {leftLabel}
        </button>
        <span style={{ ...font, fontSize: 15, fontWeight: 600, color: LABEL }}>{title}</span>
        <button
          onClick={onRight}
          disabled={!rightEnabled}
          style={{ background: 'none', border: 'none', ...font, fontSize: 16, fontWeight: 600, color: rightEnabled ? TINT : '#c7c7cc', cursor: rightEnabled ? 'pointer' : 'not-allowed', padding: 4 }}
        >
          {rightLabel}
        </button>
      </div>
    </div>
  )
}

function AddBookingSheet({ close }: { close: () => void }) {
  const [step, setStep] = useState(1)
  const [confirmed, setConfirmed] = useState(false)
  const [data, setData] = useState({ brand: '', type: '', firstname: '', lastname: '', email: '', phone: '', project: '', date: '', time: '' })
  const totalSteps = 5
  const update = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }))

  const stepTitles = ['Brand', 'Appointment', 'Contact', 'Project & Time', 'Review']

  const canNext: Record<number, boolean> = {
    1: !!data.brand,
    2: !!data.type,
    3: !!(data.firstname && data.lastname && data.phone),
    4: !!(data.project && data.date && data.time),
    5: true,
  }

  const handleRight = () => {
    if (step === totalSteps) setConfirmed(true)
    else setStep((s) => s + 1)
  }
  const handleLeft = () => (step === 1 ? close() : setStep((s) => s - 1))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
      <div style={{ position: 'relative', background: BG, borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '88%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {confirmed ? (
          <SuccessScreen close={close} name={data.firstname} />
        ) : (
          <>
            <div style={{ background: CARD, borderBottom: `0.5px solid ${SEPARATOR}` }}>
              <SheetNav
                title={`New Booking · ${stepTitles[step - 1]}`}
                leftLabel={step === 1 ? 'Cancel' : 'Back'}
                onLeft={handleLeft}
                rightLabel={step === totalSteps ? 'Add' : 'Next'}
                rightEnabled={canNext[step]}
                onRight={handleRight}
              />
              <div style={{ display: 'flex', gap: 4, padding: '0 16px 10px' }}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i < step ? TINT : SEPARATOR }} />
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 40px' }}>
              {step === 1 && (
                <>
                  <SectionHeader>Which brand is this for?</SectionHeader>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <BigChoice label="FJ" sub="Sold by Fahad" selected={data.brand === 'FJ'} onClick={() => update('brand', 'FJ')} />
                    <BigChoice label="Precon Factory" sub="Precon listings" selected={data.brand === 'Precon Factory'} onClick={() => update('brand', 'Precon Factory')} />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <SectionHeader>Appointment type</SectionHeader>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {APPT_TYPES.map((t) => (
                      <IconChoice key={t.key} Icon={t.icon} label={t.label} selected={data.type === t.key} onClick={() => update('type', t.key)} />
                    ))}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <SectionHeader>Contact details</SectionHeader>
                  <GroupedList>
                    <FormRow label="First name" value={data.firstname} onChange={(v) => update('firstname', v)} />
                    <FormRow label="Last name" value={data.lastname} onChange={(v) => update('lastname', v)} />
                    <FormRow label="Phone" value={data.phone} onChange={(v) => update('phone', v)} type="tel" />
                    <FormRow label="Email" value={data.email} onChange={(v) => update('email', v)} type="email" last />
                  </GroupedList>
                </>
              )}

              {step === 4 && (
                <>
                  <SectionHeader>Project, date & time</SectionHeader>
                  <GroupedList>
                    <FormRow label="Project name" value={data.project} onChange={(v) => update('project', v)} />
                    <FormRow label="Date" value={data.date} onChange={(v) => update('date', v)} type="date" />
                    <FormRow label="Time" value={data.time} onChange={(v) => update('time', v)} type="time" last />
                  </GroupedList>
                </>
              )}

              {step === 5 && (
                <>
                  <SectionHeader>Review</SectionHeader>
                  <GroupedList>
                    <Row leading={<IconChip Icon={User} tint={TINT} />} title={`${data.firstname} ${data.lastname}`} subtitle={data.phone} />
                    <Row leading={<IconChip Icon={Building2} tint={GOLD} />} title={data.project} subtitle={`${data.date || '—'} at ${data.time || '—'}`} />
                    <Row
                      last
                      leading={<IconChip Icon={typeIcon(data.type)} tint={TINT} />}
                      title={APPT_TYPES.find((t) => t.key === data.type)?.label || ''}
                      subtitle={data.brand}
                    />
                  </GroupedList>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SuccessScreen({ close, name }: { close: () => void; name: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 999, background: TINT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Check size={32} color="#fff" strokeWidth={2.8} />
      </div>
      <div style={{ ...font, fontSize: 21, color: LABEL, fontWeight: 700, marginBottom: 6 }}>Booking Added</div>
      <div style={{ ...font, fontSize: 14, color: SECONDARY, marginBottom: 26 }}>
        {name ? `${name}'s appointment` : 'The appointment'} is on the calendar.
      </div>
      <button onClick={close} style={{ background: TINT, border: 'none', borderRadius: 12, padding: '13px 46px', ...font, fontWeight: 600, fontSize: 15.5, color: '#fff', cursor: 'pointer' }}>
        Done
      </button>
    </div>
  )
}

function BigChoice({ label, sub, selected, onClick }: { label: string; sub: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: CARD,
        border: selected ? `1.5px solid ${TINT}` : `0.5px solid ${SEPARATOR}`,
        borderRadius: 12,
        padding: '16px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
    >
      <div>
        <div style={{ ...font, fontWeight: 600, fontSize: 16, color: LABEL }}>{label}</div>
        <div style={{ ...font, fontSize: 12.5, color: SECONDARY, marginTop: 1 }}>{sub}</div>
      </div>
      {selected ? (
        <div style={{ width: 22, height: 22, borderRadius: 999, background: TINT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={13} color="#fff" strokeWidth={3} />
        </div>
      ) : (
        <div style={{ width: 22, height: 22, borderRadius: 999, border: `1.5px solid ${SEPARATOR}` }} />
      )}
    </button>
  )
}

function IconChoice({ Icon, label, selected, onClick }: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: CARD,
        border: selected ? `1.5px solid ${TINT}` : `0.5px solid ${SEPARATOR}`,
        borderRadius: 12,
        padding: '18px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: selected ? TINT : TINT_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={19} color={selected ? '#fff' : TINT} strokeWidth={2} />
      </div>
      <span style={{ ...font, fontWeight: 600, fontSize: 12.5, color: LABEL, textAlign: 'center' }}>{label}</span>
    </button>
  )
}

function FormRow({ label, value, onChange, type = 'text', last }: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  last?: boolean
}) {
  return (
    <div style={{ padding: '9px 14px', borderBottom: last ? 'none' : `0.5px solid ${SEPARATOR}` }}>
      <div style={{ ...font, fontSize: 11.5, color: SECONDARY, fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', border: 'none', outline: 'none', ...font, fontSize: 16, fontWeight: 400, color: LABEL, background: 'transparent', padding: '2px 0' }}
      />
    </div>
  )
}

// ---------- Root Mobile Dashboard ----------
export default function MobileDashboard() {
  const [tab, setTab] = useState('home')
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div style={{ height: '100dvh', background: BG, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {tab === 'home' && <HomeTab openAdd={() => setShowAdd(true)} />}
        {tab === 'bookings' && <BookingsTab />}
        {tab === 'leads' && <LeadsTab />}
        {tab === 'page' && <PageTab />}
        {tab === 'more' && <MoreTab />}
      </div>

      <TabBar active={tab} setActive={setTab} />

      {showAdd && <AddBookingSheet close={() => setShowAdd(false)} />}
    </div>
  )
}
