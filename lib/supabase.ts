import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** Server-only: service role bypasses RLS — never commit this key; set SUPABASE_SERVICE_KEY in env only. */
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY for admin Supabase client.'
    )
  }
  const globalForAdmin = globalThis as unknown as { __propdash_supabase_admin?: ReturnType<typeof createClient> }
  if (!globalForAdmin.__propdash_supabase_admin) {
    globalForAdmin.__propdash_supabase_admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })
  }
  return globalForAdmin.__propdash_supabase_admin
}

type BrowserSupabase = ReturnType<typeof createClient>

const globalForSupabase = globalThis as unknown as {
  supabase?: BrowserSupabase
}

// Single Supabase client instance - avoid multiple GoTrueClient in same browser context
function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.local or Vercel.'
    )
  }
  if (typeof window !== 'undefined') {
    const win = window as Window & { __propdash_supabase?: BrowserSupabase }
    if (win.__propdash_supabase) return win.__propdash_supabase
    win.__propdash_supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'property-dashboard-auth',
        storage: window.localStorage,
      },
    })
    return win.__propdash_supabase
  }
  if (!globalForSupabase.supabase) {
    globalForSupabase.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })
  }
  return globalForSupabase.supabase!
}

export const supabase = getSupabaseClient()

/** PostgREST returns at most 1000 rows per request. Page until the table is exhausted. */
export async function fetchAllRows<T>(
  loadPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000
  const rows: T[] = []
  let from = 0

  for (let page = 0; page < 100; page++) {
    const { data, error } = await loadPage(from, from + pageSize - 1)
    if (error) throw error
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return rows
}
