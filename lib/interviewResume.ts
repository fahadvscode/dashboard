import { createClient } from '@supabase/supabase-js'

export const INTERVIEW_RESUME_BUCKET = 'career-resumes'

export type InterviewResumeAttachment = {
  filename: string
  content: Buffer
  contentType: string
}

export type InterviewResumeRef = {
  fileName: string
  path: string | null
  url: string | null
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text ? text : null
}

function fileNameFromPath(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] || 'resume'
}

function contentTypeForFileName(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.doc')) return 'application/msword'
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (lower.endsWith('.txt')) return 'text/plain'
  if (lower.endsWith('.rtf')) return 'application/rtf'
  return 'application/octet-stream'
}

function publicResumeUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${INTERVIEW_RESUME_BUCKET}/${path.replace(/^\//, '')}`
}

export function resolveInterviewResume(booking: Record<string, unknown>): InterviewResumeRef | null {
  const fileName = asTrimmedString(booking.resume_file_name)
  const path = asTrimmedString(booking.resume_path)
  const rawUrl = asTrimmedString(booking.resume_url)
  const url =
    rawUrl && /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : path
        ? publicResumeUrl(path)
        : null

  if (!fileName && !path && !url) return null

  return {
    fileName: fileName || (path ? fileNameFromPath(path) : 'resume'),
    path,
    url,
  }
}

export function buildInterviewResumeEmailHtml(booking: Record<string, unknown>): string {
  const resume = resolveInterviewResume(booking)
  if (!resume) return ''

  const label = escapeHtml(resume.fileName)
  const link = resume.url
    ? `<a href="${escapeHtml(resume.url)}" target="_blank" style="color:#2563eb;font-weight:bold;">${label}</a>`
    : label

  return `<div style="background:#eff6ff;padding:14px;border-radius:8px;margin:16px 0;border-left:4px solid #3b82f6;">
          <strong>Resume</strong><br>
          <p style="margin:8px 0 0 0;">${link}${resume.url ? ' — also attached to this email.' : ''}</p>
        </div>`
}

export function buildInterviewResumeSmsLine(booking: Record<string, unknown>): string {
  const resume = resolveInterviewResume(booking)
  if (!resume) return ''
  return `\n📄 Resume: ${resume.fileName}`
}

export async function loadInterviewResumeAttachment(
  booking: Record<string, unknown>
): Promise<InterviewResumeAttachment | null> {
  const resume = resolveInterviewResume(booking)
  if (!resume) return null

  if (resume.url) {
    try {
      const response = await fetch(resume.url, { signal: AbortSignal.timeout(10000) })
      if (response.ok) {
        const content = Buffer.from(await response.arrayBuffer())
        if (content.length > 0) {
          return {
            filename: resume.fileName,
            content,
            contentType: contentTypeForFileName(resume.fileName),
          }
        }
      }
    } catch (error) {
      console.error('Could not fetch interview resume URL:', error)
    }
  }

  if (!resume.path) return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await supabase.storage.from(INTERVIEW_RESUME_BUCKET).download(resume.path)
    if (error || !data) {
      console.error('Could not download interview resume from storage:', error?.message)
      return null
    }
    const content = Buffer.from(await data.arrayBuffer())
    if (!content.length) return null
    return {
      filename: resume.fileName,
      content,
      contentType: contentTypeForFileName(resume.fileName),
    }
  } catch (error) {
    console.error('Could not load interview resume attachment:', error)
    return null
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
