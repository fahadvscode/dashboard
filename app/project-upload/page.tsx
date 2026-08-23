'use client'

import { Building2 } from 'lucide-react'
import ProjectUploadForm from '@/components/ProjectUploadForm'

export default function ProjectUploadPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8 max-w-3xl">
      <div className="mb-6 mt-12 lg:mt-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="h-7 w-7 text-blue-600" />
          Upload Project
        </h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">
          Manually add a project to Canada Properties when the monitor misses it.
        </p>
      </div>
      <ProjectUploadForm />
    </div>
  )
}
