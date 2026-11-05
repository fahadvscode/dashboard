import { NextRequest, NextResponse } from 'next/server'
import { getWorksheet, saveWorksheet } from '@/lib/worksheets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const worksheet = await getWorksheet(id)
    if (!worksheet) return NextResponse.json({ error: 'Worksheet not found.' }, { status: 404 })
    return NextResponse.json({ worksheet })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not open the worksheet.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const saved = await saveWorksheet(body, id)
    if ('error' in saved) return NextResponse.json({ error: saved.error }, { status: saved.status })
    return NextResponse.json(saved)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update the worksheet.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
