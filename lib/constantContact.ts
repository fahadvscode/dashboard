import { getSupabaseAdmin } from '@/lib/supabase'

export const CONSTANT_CONTACT_TOKEN_TYPE = 'constant_contact'
export const CONSTANT_CONTACT_SECOND_TOKEN_TYPE = 'constant_contact_2'
export const CONSTANT_CONTACT_THIRD_TOKEN_TYPE = 'constant_contact_3'

export type ConstantContactAccount = 'primary' | 'second' | 'third'

const ACCOUNT_CONFIG = {
  primary: {
    tokenType: CONSTANT_CONTACT_TOKEN_TYPE,
    clientIdKey: 'CONSTANT_CONTACT_API_KEY',
    clientSecretKey: 'CONSTANT_CONTACT_CLIENT_SECRET',
  },
  second: {
    tokenType: CONSTANT_CONTACT_SECOND_TOKEN_TYPE,
    clientIdKey: 'CONSTANT_CONTACT_2_API_KEY',
    clientSecretKey: 'CONSTANT_CONTACT_2_CLIENT_SECRET',
  },
  third: {
    tokenType: CONSTANT_CONTACT_THIRD_TOKEN_TYPE,
    clientIdKey: 'CONSTANT_CONTACT_3_API_KEY',
    clientSecretKey: 'CONSTANT_CONTACT_3_CLIENT_SECRET',
  },
} as const

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

export function constantContactAccountFromState(state: string | null): ConstantContactAccount | null {
  if (state === CONSTANT_CONTACT_TOKEN_TYPE) return 'primary'
  if (state === CONSTANT_CONTACT_SECOND_TOKEN_TYPE) return 'second'
  if (state === CONSTANT_CONTACT_THIRD_TOKEN_TYPE) return 'third'
  return null
}

export function constantContactTokenType(account: ConstantContactAccount = 'primary') {
  return ACCOUNT_CONFIG[account].tokenType
}

export function getConstantContactCredentials(account: ConstantContactAccount = 'primary') {
  const config = ACCOUNT_CONFIG[account]
  const clientId = String(process.env[config.clientIdKey] || '').trim()
  const clientSecret = String(process.env[config.clientSecretKey] || '').trim()
  if (!clientId || !clientSecret) {
    throw new Error(`${config.clientIdKey} and ${config.clientSecretKey} are not set.`)
  }
  return { clientId, clientSecret }
}

export function getConstantContactRedirectUri() {
  return String(process.env.CONSTANT_CONTACT_REDIRECT_URI || CONSTANT_CONTACT_REDIRECT_URI).trim()
}

export function buildConstantContactAuthUrl(account: ConstantContactAccount = 'primary') {
  const { clientId } = getConstantContactCredentials(account)
  const url = new URL(AUTH_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', getConstantContactRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', CONSTANT_CONTACT_SCOPES.join(' '))
  url.searchParams.set('state', constantContactTokenType(account))
  url.searchParams.set('prompt', 'login')
  return url.toString()
}

async function requestToken(body: Record<string, string>, account: ConstantContactAccount = 'primary') {
  const { clientId, clientSecret } = getConstantContactCredentials(account)
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

export function exchangeConstantContactCode(code: string, account: ConstantContactAccount = 'primary') {
  return requestToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getConstantContactRedirectUri(),
  }, account)
}

export function refreshConstantContactToken(refreshToken: string, account: ConstantContactAccount = 'primary') {
  return requestToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }, account)
}

export async function saveConstantContactToken(
  token: TokenResponse,
  fallbackRefresh?: string | null,
  account: ConstantContactAccount = 'primary'
) {
  const refreshToken = token.refresh_token || fallbackRefresh
  if (!token.access_token || !refreshToken) {
    throw new Error('Constant Contact did not return a refresh token. Approve access again.')
  }
  const expiresIn = Number(token.expires_in || 0)
  const expiryDate = expiresIn > 0 ? Date.now() + expiresIn * 1000 : null
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('calendar_tokens').upsert(
    {
      calendar_type: constantContactTokenType(account),
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

function resolveConstantContactUrl(path: string) {
  if (path.startsWith('http')) return path
  const withoutVersion = path.startsWith('/v3/') ? path.slice(3) : path
  return `${API_URL}${withoutVersion.startsWith('/') ? withoutVersion : `/${withoutVersion}`}`
}

async function loadConstantContactAccessToken(account: ConstantContactAccount, forceRefresh = false) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('calendar_tokens')
    .select('access_token, refresh_token, expiry_date')
    .eq('calendar_type', constantContactTokenType(account))
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.access_token || !data.refresh_token) {
    throw new Error('Constant Contact is not connected.')
  }

  const expiry = Number(data.expiry_date || 0)
  if (!forceRefresh && (!expiry || expiry >= Date.now() + 60_000)) {
    return String(data.access_token)
  }

  const refreshed = await refreshConstantContactToken(String(data.refresh_token), account)
  await saveConstantContactToken(refreshed, String(data.refresh_token), account)
  return String(refreshed.access_token)
}

export async function constantContactFetch(path: string, account: ConstantContactAccount = 'primary') {
  const request = async (forceRefresh: boolean) => {
    const accessToken = await loadConstantContactAccessToken(account, forceRefresh)
    const response = await fetch(resolveConstantContactUrl(path), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'User-Agent': 'property-dashboard',
      },
      cache: 'no-store',
    })
    const json = await response.json().catch(() => ({}))
    return { response, json }
  }

  let { response, json } = await request(false)
  if (response.status === 401) {
    try {
      const retried = await request(true)
      response = retried.response
      json = retried.json
    } catch {
      throw new Error('This Constant Contact account needs to be connected again.')
    }
  }
  if (!response.ok) {
    const message = (json as { error_message?: string; error_key?: string; error?: string }).error_message
      || (json as { error?: string }).error
      || 'Constant Contact request failed.'
    if (response.status === 429) throw new Error('Constant Contact is busy. Press Refresh in a minute.')
    throw new Error(message)
  }
  return json as Record<string, unknown>
}
