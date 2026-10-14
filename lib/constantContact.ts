import { getSupabaseAdmin } from '@/lib/supabase'

export const CONSTANT_CONTACT_TOKEN_TYPE = 'constant_contact'
export const CONSTANT_CONTACT_REDIRECT_URI =
  'https://property-dashboard-three.vercel.app/api/constant-contact/oauth-callback'

const AUTH_URL = 'https://authz.constantcontact.com/oauth2/default/v1/authorize'
const TOKEN_URL = 'https://authz.constantcontact.com/oauth2/default/v1/token'
const API_URL = 'https://api.cc.email/v3'

export const CONSTANT_CONTACT_SCOPES = [
  'account_read',
  'account_update',
  'contact_data',
  'campaign_data',
  'offline_access',
]

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

export function getConstantContactCredentials() {
  const clientId = String(process.env.CONSTANT_CONTACT_API_KEY || '').trim()
  const clientSecret = String(process.env.CONSTANT_CONTACT_CLIENT_SECRET || '').trim()
  if (!clientId || !clientSecret) {
    throw new Error('CONSTANT_CONTACT_API_KEY and CONSTANT_CONTACT_CLIENT_SECRET are not set.')
  }
  return { clientId, clientSecret }
}

export function getConstantContactRedirectUri() {
  return String(process.env.CONSTANT_CONTACT_REDIRECT_URI || CONSTANT_CONTACT_REDIRECT_URI).trim()
}

export function buildConstantContactAuthUrl() {
  const { clientId } = getConstantContactCredentials()
  const url = new URL(AUTH_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', getConstantContactRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', CONSTANT_CONTACT_SCOPES.join(' '))
  url.searchParams.set('state', CONSTANT_CONTACT_TOKEN_TYPE)
  return url.toString()
}

async function requestToken(body: Record<string, string>) {
  const { clientId, clientSecret } = getConstantContactCredentials()
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(body),
  })
  const json = (await response.json().catch(() => ({}))) as TokenResponse
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || 'Constant Contact did not return an access token.')
  }
  return json
}

export function exchangeConstantContactCode(code: string) {
  return requestToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getConstantContactRedirectUri(),
  })
}

export function refreshConstantContactToken(refreshToken: string) {
  return requestToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
}

export async function saveConstantContactToken(token: TokenResponse, fallbackRefresh?: string | null) {
  const refreshToken = token.refresh_token || fallbackRefresh
  if (!token.access_token || !refreshToken) {
    throw new Error('Constant Contact did not return a refresh token. Approve access again.')
  }
  const expiresIn = Number(token.expires_in || 0)
  const expiryDate = expiresIn > 0 ? Date.now() + expiresIn * 1000 : null
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('calendar_tokens').upsert(
    {
      calendar_type: CONSTANT_CONTACT_TOKEN_TYPE,
      access_token: token.access_token,
      refresh_token: refreshToken,
      expiry_date: expiryDate,
      token_type: token.token_type || 'Bearer',
      scope: token.scope || CONSTANT_CONTACT_SCOPES.join(' '),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'calendar_type' }
  )
  if (error) throw new Error(error.message)
}

export async function constantContactFetch(path: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('calendar_tokens')
    .select('access_token, refresh_token, expiry_date')
    .eq('calendar_type', CONSTANT_CONTACT_TOKEN_TYPE)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.access_token || !data.refresh_token) {
    throw new Error('Constant Contact is not connected.')
  }

  let accessToken = String(data.access_token)
  const expiry = Number(data.expiry_date || 0)
  if (expiry && expiry < Date.now() + 60_000) {
    const refreshed = await refreshConstantContactToken(String(data.refresh_token))
    await saveConstantContactToken(refreshed, String(data.refresh_token))
    accessToken = String(refreshed.access_token)
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = (json as { error_message?: string; error?: string }).error_message
      || (json as { error?: string }).error
      || 'Constant Contact request failed.'
    throw new Error(message)
  }
  return json as Record<string, unknown>
}
