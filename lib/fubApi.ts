const FUB_API = 'https://api.followupboss.com/v1'

export function getFubApiKey() {
  return (
    String((process.env as Record<string, string | undefined>).FUB_API_KEY || '').trim() ||
    String((process.env as Record<string, string | undefined>).FOLLOW_UP_BOSS_API_KEY || '').trim()
  )
}

export function fubApiHeaders() {
  const apiKey = getFubApiKey()
  if (!apiKey) return null
  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const system = String((process.env as Record<string, string | undefined>).FUB_X_SYSTEM || '').trim()
  if (system) headers['X-System'] = system
  return headers
}

export async function fubApiFetch(path: string, init: RequestInit = {}) {
  const headers = fubApiHeaders()
  if (!headers) {
    throw new Error('Follow Up Boss API key is not set.')
  }
  const response = await fetch(`${FUB_API}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  })
  const text = await response.text()
  let json: unknown = {}
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = { error: text }
    }
  }
  return { ok: response.ok, status: response.status, json }
}
