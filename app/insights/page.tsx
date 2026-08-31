'use client'

import LatestProjects from '@/components/LatestProjects'
import SearchConsoleInsights from '@/components/SearchConsoleInsights'
import { CheckSquare, ClipboardList, ExternalLink, ThumbsDown } from 'lucide-react'

const TASK_MANAGER_URL = 'https://task-management-app-flame-seven.vercel.app/'
const DAILY_REPORT_URL = 'https://fahadsells.com/internal/timecard'
const PROJECTS_SAID_NO_URL = 'https://fahadsells.com/internal/no-log'

export default function InsightsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
      <div className="mb-6 mt-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Insights</h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">
          Latest project updates, Search Console, and tasks
        </p>
      </div>

      <SearchConsoleInsights />

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <a
          href={TASK_MANAGER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3.5 text-white shadow-md hover:from-indigo-700 hover:to-indigo-800"
        >
          <span className="inline-flex items-center gap-2 font-semibold">
            <CheckSquare className="h-5 w-5" />
            Task Manager
          </span>
          <ExternalLink className="h-4 w-4 opacity-80" />
        </a>
        <a
          href={DAILY_REPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-700 px-4 py-3.5 text-white shadow-md hover:from-cyan-700 hover:to-teal-800"
        >
          <span className="inline-flex items-center gap-2 font-semibold">
            <ClipboardList className="h-5 w-5" />
            Daily Report
          </span>
          <ExternalLink className="h-4 w-4 opacity-80" />
        </a>
        <a
          href={PROJECTS_SAID_NO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 px-4 py-3.5 text-white shadow-md hover:from-rose-700 hover:to-red-800"
        >
          <span className="inline-flex items-center gap-2 font-semibold">
            <ThumbsDown className="h-5 w-5" />
            Projects said NO
          </span>
          <ExternalLink className="h-4 w-4 opacity-80" />
        </a>
      </div>

      <LatestProjects />
    </div>
  )
}
