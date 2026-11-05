import { NextRequest, NextResponse } from 'next/server'
import { searchCanadaProjects } from '@/lib/fubProjects'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const projects = await searchCanadaProjects(request.nextUrl.searchParams.get('q') || '')
    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Worksheet project search failed:', error)
    return NextResponse.json({ projects: [] })
  }
}
