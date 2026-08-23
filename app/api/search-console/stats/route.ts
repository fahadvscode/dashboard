import { NextRequest, NextResponse } from 'next/server'
import { fetchSearchConsoleStats, isSearchConsoleConnected } from '@/lib/searchConsole'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const connected = await isSearchConsoleConnected()
    if (!connected) {
      return NextResponse.json({ connected: false })
    }

    const siteUrl = request.nextUrl.searchParams.get('siteUrl') || undefined
    const stats = await fetchSearchConsoleStats(siteUrl)
    return NextResponse.json(stats)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Search Console'
    const needsConnect = message.includes('not connected')
    return NextResponse.json(
      { connected: false, error: message },
      { status: needsConnect ? 200 : 500 }
    )
  }
}
