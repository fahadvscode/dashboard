import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getSearchConsoleOAuthClient,
  getSearchConsoleRedirectUri,
  SEARCH_CONSOLE_TOKEN_TYPE,
} from '@/lib/searchConsole'

function insightsRedirect(request: NextRequest, query: string) {
  return NextResponse.redirect(new URL(`/insights?${query}`, request.url))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return insightsRedirect(request, `gsc=error&reason=${encodeURIComponent(error)}`)
    }
    if (!code) {
      return insightsRedirect(request, 'gsc=error&reason=missing_code')
    }

    const oauth2Client = getSearchConsoleOAuthClient()
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: getSearchConsoleRedirectUri(),
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return insightsRedirect(request, 'gsc=error&reason=database')
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    let refreshToken = tokens.refresh_token
    if (!refreshToken) {
      const { data: existing } = await supabase
        .from('calendar_tokens')
        .select('refresh_token')
        .eq('calendar_type', SEARCH_CONSOLE_TOKEN_TYPE)
        .maybeSingle()
      refreshToken = existing?.refresh_token
    }

    if (!refreshToken) {
      return insightsRedirect(request, 'gsc=error&reason=refresh_token')
    }

    const { error: dbError } = await supabase.from('calendar_tokens').upsert(
      {
        calendar_type: SEARCH_CONSOLE_TOKEN_TYPE,
        access_token: tokens.access_token,
        refresh_token: refreshToken,
        expiry_date: tokens.expiry_date,
        token_type: tokens.token_type || 'Bearer',
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'calendar_type' }
    )

    if (dbError) {
      console.error('Search Console token store failed:', dbError)
      return insightsRedirect(request, 'gsc=error&reason=store')
    }

    return insightsRedirect(request, 'gsc=connected')
  } catch (error) {
    console.error('Search Console OAuth callback failed:', error)
    return insightsRedirect(request, 'gsc=error&reason=callback')
  }
}
