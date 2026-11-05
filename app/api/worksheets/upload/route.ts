import { NextRequest, NextResponse } from 'next/server'
import { extractIdFields } from '@/lib/worksheetExtract'
import { sniffWorksheetFile, uploadWorksheetFile } from '@/lib/worksheets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 8 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const kind = form.get('kind') === 'document' ? 'document' : 'id'
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Choose a PDF, PNG, or JPG file.' }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Use a file under 8 MB.' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const mime = sniffWorksheetFile(buffer)
    if (!mime) {
      return NextResponse.json({ error: 'Upload a PDF, PNG, JPG, or WEBP file.' }, { status: 400 })
    }
    const stored = await uploadWorksheetFile(buffer, file.name || 'id', mime, kind)
    if (kind === 'document') {
      return NextResponse.json({ file: stored, fields: null, message: '' })
    }
    const extracted = await extractIdFields(buffer, mime)
    return NextResponse.json({ file: stored, fields: extracted.fields, message: extracted.message })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not upload the ID.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
