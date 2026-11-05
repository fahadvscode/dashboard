import { NextRequest, NextResponse } from 'next/server'
import { listWorksheets, saveWorksheet } from '@/lib/worksheets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const worksheets = await listWorksheets(request.nextUrl.searchParams.get('clientId') || '')
    return NextResponse.json({ worksheets })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load worksheets.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (body && typeof body === 'object') delete body.id
    const saved = await saveWorksheet(body)
    if ('error' in saved) return NextResponse.json({ error: saved.error }, { status: saved.status })
    return NextResponse.json(saved)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save the worksheet.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
