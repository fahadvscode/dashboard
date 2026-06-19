import { NextRequest, NextResponse } from 'next/server'
import { uploadProject, type ImageFileInput, type ProjectUploadInput } from '@/lib/projectUpload'

const FORM_FIELDS: (keyof ProjectUploadInput)[] = [
  'project_name',
  'builder',
  'website_url',
  'address',
  'city',
  'price',
  'sqft',
  'details',
  'quick_facts',
  'picture_urls',
]

function parseJsonBody(body: ProjectUploadInput) {
  if (!body.project_name?.trim()) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
  }

  return body
}

async function parseMultipartBody(request: NextRequest) {
  const formData = await request.formData()
  const input = {} as ProjectUploadInput

  for (const field of FORM_FIELDS) {
    const value = formData.get(field)
    if (typeof value === 'string') {
      input[field] = value
    }
  }

  if (!input.project_name?.trim()) {
    return { error: NextResponse.json({ error: 'Project name is required' }, { status: 400 }) }
  }

  const imageFiles: ImageFileInput[] = []

  for (const entry of formData.getAll('images')) {
    if (!(entry instanceof File) || entry.size === 0) continue

    if (!entry.type.startsWith('image/')) {
      return {
        error: NextResponse.json(
          { error: `${entry.name} is not a valid image file` },
          { status: 400 }
        ),
      }
    }

    const maxSize = 20 * 1024 * 1024
    if (entry.size > maxSize) {
      return {
        error: NextResponse.json(
          { error: `${entry.name} is too large. Max size is 20MB per image.` },
          { status: 400 }
        ),
      }
    }

    imageFiles.push({
      data: await entry.arrayBuffer(),
      filename: entry.name,
      contentType: entry.type || 'image/jpeg',
    })
  }

  return { input, imageFiles }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const parsed = await parseMultipartBody(request)
      if ('error' in parsed && parsed.error) return parsed.error

      const result = await uploadProject(parsed.input!, parsed.imageFiles ?? [])
      return NextResponse.json({ result })
    }

    const body = parseJsonBody((await request.json()) as ProjectUploadInput)
    if (body instanceof NextResponse) return body

    const result = await uploadProject(body)
    return NextResponse.json({ result })
  } catch (error) {
    console.error('Project upload failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload project' },
      { status: 500 }
    )
  }
}
