import { NextResponse } from 'next/server'
import { getSearchConsoleOAuthClient, SEARCH_CONSOLE_SCOPE } from '@/lib/searchConsole'

export async function GET() {
  try {
    const oauth2Client = getSearchConsoleOAuthClient()
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'select_account consent',
      include_granted_scopes: false,
      scope: [SEARCH_CONSOLE_SCOPE],
      state: 'search_console',
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Search Console OAuth start failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start Search Console login.' },
      { status: 500 }
    )
  }
}
