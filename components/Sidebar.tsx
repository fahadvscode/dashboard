'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Calendar, Mail, Building2, Mailbox, LogOut, FileText, MessageSquare, Smartphone, Link2, Copy, Check, Edit, ChevronDown, ChevronUp, Brain, Upload, CheckSquare, FolderOpen, MapPinned } from 'lucide-react'
import { useState } from 'react'
import { logout } from '@/lib/auth'

const TASK_MANAGER_URL = 'https://v0-task-management-app-y4.vercel.app/'

const navigation = [
  { name: 'Canada Properties', href: '/', icon: Building2 },
  { name: 'Project Presentation', href: '/project-presentation', icon: MapPinned },
  { name: 'Project Collections', href: '/collections', icon: FolderOpen },
  { name: 'AI Lead Insights', href: '/ai-insights', icon: Brain },
  { name: 'Media Upload', href: '/media-upload', icon: Upload },
  { name: 'SMS Conversations', href: '/conversations', icon: MessageSquare },
  { name: 'FJ Bookings', href: '/fj-bookings', icon: Calendar },
  { name: 'FJ Leads', href: '/fj-leads', icon: Mail },
  { name: 'Precon Factory Bookings', href: '/precon-bookings', icon: Calendar },
  { name: 'Precon Factory Leads', href: '/precon-leads', icon: Mail },
  { name: 'Precon Factory Website Leads', href: '/precon-factory-website-leads', icon: Mail },
  { name: 'GTA Lowrise Bookings', href: '/gta-lowrise-bookings', icon: Calendar },
  { name: 'GTA Lowrise Leads', href: '/gta-lowrise-leads', icon: Mail },
  { name: 'Rental Leads', href: '/rental-leads', icon: Mail },
  { name: 'Landing Pages Leads', href: '/landing-pages-leads', icon: Mail },
]

const BOOKING_PAGES = {
  fj: 'https://www.qikfill.com/fj-booking',
  precon: 'https://www.qikfill.com/preconfactory-booking'
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [showBookingPages, setShowBookingPages] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [showTools, setShowTools] = useState(false) // Collapsible tools on mobile

  const handleLogout = () => {
    logout()
    router.push('/')
    window.location.reload()
  }

  const handleCopyLink = async (link: string, type: 'fj' | 'precon') => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLink(type)
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-blue-600 text-white rounded-lg shadow-lg"
        aria-expanded={isOpen}
        aria-controls="app-sidebar"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        id="app-sidebar"
        className={`
        fixed md:relative inset-y-0 left-0 z-40 shrink-0
        flex h-dvh max-h-dvh md:h-full md:max-h-none flex-col
        w-[min(100vw,16rem)] sm:w-64 xl:w-72
        bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
        {/* Logo/Header */}
        <div className="h-16 shrink-0 flex items-center px-6 border-b border-gray-200">
          <Building2 className="h-8 w-8 text-blue-600" />
          <span className="ml-3 text-xl font-bold text-gray-900 truncate">PropDash</span>
        </div>

        {/* Scrollable: routes + tools + logout (short viewports still reach everything) */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain">
        {/* Task Manager - Top, always visible, mobile-friendly */}
        <div className="shrink-0 px-4 pt-4 pb-2 border-b border-gray-100">
          <a
            href={TASK_MANAGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="flex items-center w-full px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-sm shadow-md hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.98] transition-all touch-manipulation"
          >
            <CheckSquare className="h-5 w-5 mr-3 flex-shrink-0" />
            Task Manager
          </a>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-4 md:py-6 space-y-1 md:space-y-2">
          {navigation.map((item) => {
            const isActive = !('external' in item) && pathname === item.href
            const Icon = item.icon
            const className = `flex items-center px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-[15px] font-medium rounded-lg transition-colors touch-manipulation ${
              isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
            }`

            if ('external' in item && item.external) {
              return (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className={className}
                >
                  <Icon className={`h-5 w-5 md:h-5 md:w-5 mr-2 md:mr-3 text-gray-400 shrink-0`} />
                  {item.name}
                </a>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={className}
              >
                <Icon className={`h-5 w-5 md:h-5 md:w-5 mr-2 md:mr-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* External Tools */}
        <div className="shrink-0 border-t border-gray-200">
          {/* Tools Toggle Button (Mobile Only) */}
          <button
            type="button"
            onClick={() => setShowTools(!showTools)}
            className="md:hidden w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span>Tools & Links</span>
            {showTools ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {/* Tools Container - Hidden on mobile unless toggled */}
          <div className={`px-4 pb-4 pt-2 md:pt-4 ${showTools ? 'block' : 'hidden md:block'}`}>
            {/* PDF Processor Button */}
            <a
              href="https://pdfmanipulator.streamlit.app/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-[15px] font-medium rounded-lg transition-colors touch-manipulation bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 active:from-purple-700 active:to-purple-800 shadow-md hover:shadow-lg mb-2 md:mb-3"
            >
              <FileText className="h-5 w-5 md:h-5 md:w-5 mr-2 md:mr-3 shrink-0" />
              PDF Processor
            </a>

            {/* Email Creator Button */}
            <a
              href="https://email-creator-beta.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-[15px] font-medium rounded-lg transition-colors touch-manipulation bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 active:from-orange-700 active:to-orange-800 shadow-md hover:shadow-lg mb-2 md:mb-3"
            >
              <Mailbox className="h-5 w-5 md:h-5 md:w-5 mr-2 md:mr-3 shrink-0" />
              Email Creator
            </a>

            {/* SMS Creator Button */}
            <Link
              href="/sms-creator"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-[15px] font-medium rounded-lg transition-colors touch-manipulation bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700 active:from-green-700 active:to-teal-800 shadow-md hover:shadow-lg mb-2 md:mb-3"
            >
              <Smartphone className="h-5 w-5 md:h-5 md:w-5 mr-2 md:mr-3 shrink-0" />
              SMS Creator
            </Link>

            {/* Mass SMS Button */}
            <a
              href="https://sms-campaign-platform-2sgit53bx-fahadjaveds-projects.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-[15px] font-medium rounded-lg transition-colors touch-manipulation bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 active:from-indigo-700 active:to-purple-800 shadow-md hover:shadow-lg mb-2 md:mb-3"
            >
              <MessageSquare className="h-5 w-5 md:h-5 md:w-5 mr-2 md:mr-3 shrink-0" />
              Mass SMS
            </a>

            {/* Rental Form Button */}
            <a
              href="https://www.qikfill.com/rental-signup.html"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-[15px] font-medium rounded-lg transition-colors touch-manipulation bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 active:from-cyan-700 active:to-blue-800 shadow-md hover:shadow-lg mb-2 md:mb-3"
            >
              <Home className="h-5 w-5 md:h-5 md:w-5 mr-2 md:mr-3 shrink-0" />
              Rental Form
            </a>

            {/* Landing Page Editor Button */}
            <a
              href="https://qikfill-landing-page-editor.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-[15px] font-medium rounded-lg transition-colors touch-manipulation bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:from-pink-600 hover:to-rose-700 active:from-pink-700 active:to-rose-800 shadow-md hover:shadow-lg mb-2 md:mb-3"
            >
              <Edit className="h-5 w-5 md:h-5 md:w-5 mr-2 md:mr-3 shrink-0" />
              Landing Page Editor
            </a>

            {/* Booking Pages Button */}
            <div className="relative mb-2 md:mb-3">
              <button
                type="button"
                onClick={() => {
                  setShowBookingPages(!showBookingPages)
                  setIsOpen(false)
                }}
                className="w-full flex items-center px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-[15px] font-medium rounded-lg transition-colors touch-manipulation bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 shadow-md hover:shadow-lg"
              >
                <Link2 className="h-5 w-5 md:h-5 md:w-5 mr-2 md:mr-3 shrink-0" />
                Booking Pages
              </button>

              {/* Dropdown */}
              {showBookingPages && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowBookingPages(false)}
                  />
                  <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
                    {/* FJ Booking Page */}
                    <div className="border-b border-gray-200">
                      <div className="px-3 py-2 lg:px-4 lg:py-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-600 uppercase">FJ Booking</p>
                      </div>
                      <div className="px-3 py-2 lg:px-4 lg:py-3 flex items-center justify-between">
                        <a
                          href={BOOKING_PAGES.fj}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-xs lg:text-sm text-blue-600 hover:text-blue-800 truncate mr-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {BOOKING_PAGES.fj}
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyLink(BOOKING_PAGES.fj, 'fj')
                          }}
                          className="p-1.5 lg:p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                          title="Copy link"
                        >
                          {copiedLink === 'fj' ? (
                            <Check className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Precon Factory Booking Page */}
                    <div>
                      <div className="px-3 py-2 lg:px-4 lg:py-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-600 uppercase">Precon Factory Booking</p>
                      </div>
                      <div className="px-3 py-2 lg:px-4 lg:py-3 flex items-center justify-between">
                        <a
                          href={BOOKING_PAGES.precon}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-xs lg:text-sm text-purple-600 hover:text-purple-800 truncate mr-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {BOOKING_PAGES.precon}
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyLink(BOOKING_PAGES.precon, 'precon')
                          }}
                          className="p-1.5 lg:p-2 text-gray-600 hover:text-purple-600 hover:bg-gray-100 rounded transition-colors"
                          title="Copy link"
                        >
                          {copiedLink === 'precon' ? (
                            <Check className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="mb-3 flex w-full items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors touch-manipulation bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 md:mb-2 md:py-3 md:text-[15px]"
          >
            <LogOut className="h-5 w-5 md:h-5 md:w-5 mr-2 md:mr-3 shrink-0" />
            Logout
          </button>
        </div>

        </div>
        {/* End scrollable */}

        {/* Footer — fixed to bottom of sidebar column */}
        <div className="shrink-0 p-2 md:p-3 border-t border-gray-200 bg-white">
          <p className="text-xs text-gray-500 text-center">
            © 2025 Property Dashboard
          </p>
        </div>
      </aside>
    </>
  )
}

