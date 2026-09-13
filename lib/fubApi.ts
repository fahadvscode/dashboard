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

export async function addFubPersonTags(personId: string, tags: string[]) {
  const id = String(personId || '').trim()
  const next = tags.map((tag) => tag.trim()).filter(Boolean)
  if (!id || next.length === 0) {
    return { ok: false, status: 400, json: { error: 'Missing person or tags.' } }
  }
  return fubApiFetch(`/people/${encodeURIComponent(id)}?mergeTags=true`, {
    method: 'PUT',
    body: JSON.stringify({ tags: next }),
  })
}

export type FubApiUser = {
  id: number
  name: string
  email?: string
  status?: string
}

export async function listFubUsers(): Promise<FubApiUser[]> {
  const result = await fubApiFetch('/users?fields=id,name,email,status&limit=100')
  if (!result.ok) {
    const details = result.json as { error?: string; message?: string }
    throw new Error(details.error || details.message || 'Could not load Follow Up Boss users.')
  }
  const json = result.json as { users?: Array<{ id?: number; name?: string; email?: string; status?: string }> }
  const rows = Array.isArray(json.users) ? json.users : []
  const mapped = rows
    .map((row) => {
      const id = typeof row.id === 'number' ? row.id : Number(row.id)
      const name = String(row.name || '').trim()
      const status = String(row.status || '').trim()
      const email = String(row.email || '').trim()
      if (!Number.isFinite(id) || id <= 0 || !name) return null
      return { id, name, ...(email ? { email } : {}), ...(status ? { status } : {}) }
    })
    .filter((row): row is FubApiUser => Boolean(row))
  const active = mapped.filter((row) => !row.status || row.status.toLowerCase() === 'active')
  const list = active.length > 0 ? active : mapped
  return list.sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name))
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
