import { getSupabaseAdmin } from '@/lib/supabase'

export type LandingPageNameStyle = 'auto' | 'firstname' | 'first_name'

export type LandingPageSource = {
  id?: string
  table_name: string
  display_name: string
  page_name: string
  site_url: string
  name_style: LandingPageNameStyle
  enabled: boolean
  has_crm: boolean
  notes?: string | null
  /** true when defined in code even if registry row is missing */
  builtin?: boolean
  from_db?: boolean
}

export type LandingPageSheetMeta = {
  websiteName: string
  pageName: string
  siteUrl: string
}

/** Safe Postgres identifier for generated SQL (table / function names). */
export function isValidLandingPageTableName(tableName: string): boolean {
  return /^[a-z][a-z0-9_]{0,62}$/.test(tableName)
}

export function sanitizeSiteUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '')
  return `https://${trimmed.replace(/^\/\//, '').replace(/\/$/, '')}`
}

/** Built-in fallbacks so notify/dashboard work before registry SQL is run. */
export const BUILTIN_LANDING_PAGE_SOURCES: LandingPageSource[] = [
  { table_name: 'cornerstone_leads', display_name: 'Cornerstone', page_name: 'Cornerstone', site_url: 'https://www.newcornerstonehomes.ca', name_style: 'first_name', enabled: true, has_crm: true, builtin: true },
  { table_name: 'novella_leads', display_name: 'Novella', page_name: 'Novella', site_url: 'https://www.newnovellahomes.ca', name_style: 'first_name', enabled: true, has_crm: true, builtin: true },
  { table_name: 'lakeview_village_leads', display_name: 'Lakeview Village', page_name: 'Lakeview Village', site_url: 'https://lakeviewvillagetownhome.ca', name_style: 'first_name', enabled: true, has_crm: true, builtin: true },
  { table_name: 'rollingwood_leads', display_name: 'Rollingwood', page_name: 'Rollingwood', site_url: 'https://www.rollingwoodtowns.ca', name_style: 'first_name', enabled: true, has_crm: true, builtin: true },
  { table_name: 'enclave', display_name: 'Enclave', page_name: 'Enclave', site_url: 'https://enclave1.vercel.app', name_style: 'first_name', enabled: true, has_crm: false, builtin: true },
  { table_name: 'hawthorne_east_village', display_name: 'Hawthorne East Village', page_name: 'Hawthorne East Village', site_url: 'https://hawthorneeast-village.com', name_style: 'first_name', enabled: true, has_crm: false, builtin: true },
  { table_name: 'bronte_trails', display_name: 'Bronte Trails', page_name: 'Bronte Trails', site_url: 'https://www.brontetrails.ca', name_style: 'first_name', enabled: true, has_crm: false, builtin: true },
  { table_name: 'spruce_trails', display_name: 'Spruce Trails', page_name: 'Spruce Trails', site_url: 'https://sprucetrails.ca', name_style: 'first_name', enabled: true, has_crm: false, builtin: true },
  { table_name: 'meadowvale_brooks', display_name: 'Meadowvale Brooks', page_name: 'Meadowvale Brooks', site_url: 'https://meadowvalebrooks.ca', name_style: 'first_name', enabled: true, has_crm: false, builtin: true },
  { table_name: 'the_legacy', display_name: 'The Legacy', page_name: 'The Legacy', site_url: 'https://thelegacyburlington.ca', name_style: 'first_name', enabled: true, has_crm: false, builtin: true },
  { table_name: 'ivy_rouge_landing_leads', display_name: 'Ivy Rouge', page_name: 'Ivy Rouge', site_url: 'https://ivyrouge.ca', name_style: 'first_name', enabled: true, has_crm: false, builtin: true },
  { table_name: 'abacot_hill_leads', display_name: 'Abacot Hill', page_name: 'Abacot Hill', site_url: 'https://abacothill.com', name_style: 'first_name', enabled: true, has_crm: false, builtin: true },
  { table_name: 'og_urban_towns_leads', display_name: 'OG Urban Towns', page_name: 'OG Urban Towns', site_url: 'https://brightstone.ca/communities/og-urban-towns', name_style: 'first_name', enabled: true, has_crm: false, builtin: true },
  { table_name: 'rosemont_grove_leads', display_name: 'Rosemont Grove', page_name: 'Rosemont Grove', site_url: 'https://rosemontgrove.ca', name_style: 'first_name', enabled: true, has_crm: false, builtin: true },
  { table_name: 'yt_on_fourth_leads', display_name: 'YT on Fourth', page_name: 'YT on Fourth', site_url: 'https://ytonfourth.ca', name_style: 'first_name', enabled: true, has_crm: false, builtin: true },
  { table_name: 'hawthorne_trafalgar_leads', display_name: 'Hawthorne on Trafalgar', page_name: 'Hawthorne on Trafalgar', site_url: 'https://hawthornetrafalgar.com', name_style: 'firstname', enabled: true, has_crm: false, builtin: true },
]

const LEAD_TABLE_ALIASES: Record<string, string> = {
  abacot_hill: 'abacot_hill_leads',
  og_urban_towns: 'og_urban_towns_leads',
  rosemont_grove: 'rosemont_grove_leads',
  yt_on_fourth: 'yt_on_fourth_leads',
  hawthorne_trafalgar: 'hawthorne_trafalgar_leads',
}

const DASHBOARD_NOTIFY_URL = 'https://property-dashboard-three.vercel.app'

let sourcesCache: { at: number; sources: LandingPageSource[] } | null = null
const CACHE_TTL_MS = 60_000

export function clearLandingPageSourcesCache() {
  sourcesCache = null
}

export function normalizeLandingPageTableName(tableName: unknown): string | undefined {
  if (typeof tableName !== 'string') return undefined
  const normalized = tableName.trim().toLowerCase()
  if (!normalized) return undefined
  return LEAD_TABLE_ALIASES[normalized] ?? normalized
}

function mergeSources(dbRows: LandingPageSource[]): LandingPageSource[] {
  const byTable = new Map<string, LandingPageSource>()

  for (const builtin of BUILTIN_LANDING_PAGE_SOURCES) {
    byTable.set(builtin.table_name, { ...builtin })
  }

  for (const row of dbRows) {
    const existing = byTable.get(row.table_name)
    byTable.set(row.table_name, {
      ...existing,
      ...row,
      page_name: row.page_name || row.display_name,
      builtin: existing?.builtin ?? false,
      from_db: true,
    })
  }

  return [...byTable.values()].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' })
  )
}

/** Server-side: builtins + DB registry (cached ~60s). */
export async function fetchLandingPageSources(options?: {
  enabledOnly?: boolean
  bypassCache?: boolean
}): Promise<LandingPageSource[]> {
  const enabledOnly = options?.enabledOnly ?? false

  if (!options?.bypassCache && sourcesCache && Date.now() - sourcesCache.at < CACHE_TTL_MS) {
    const cached = sourcesCache.sources
    return enabledOnly ? cached.filter((s) => s.enabled) : cached
  }

  let dbRows: LandingPageSource[] = []
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await (supabase as any)
      .from('landing_page_lead_sources')
      .select('id, table_name, display_name, page_name, site_url, name_style, enabled, has_crm, notes')
      .order('display_name', { ascending: true })

    if (error) {
      // Table may not exist yet — fall back to builtins
      console.warn('landing_page_lead_sources fetch:', error.message)
    } else if (data) {
      dbRows = (data as LandingPageSource[]).map((row) => ({
        ...row,
        page_name: row.page_name || row.display_name,
        name_style: (row.name_style as LandingPageNameStyle) || 'auto',
        from_db: true,
      }))
    }
  } catch (err) {
    console.warn('landing_page_lead_sources unavailable:', err)
  }

  const merged = mergeSources(dbRows)
  sourcesCache = { at: Date.now(), sources: merged }
  return enabledOnly ? merged.filter((s) => s.enabled) : merged
}

export async function getLandingPageSourceMap(options?: {
  enabledOnly?: boolean
}): Promise<Map<string, LandingPageSource>> {
  const sources = await fetchLandingPageSources(options)
  return new Map(sources.map((s) => [s.table_name, s]))
}

export function sourceToSheetMeta(source: LandingPageSource): LandingPageSheetMeta {
  return {
    websiteName: source.display_name,
    pageName: source.page_name || source.display_name,
    siteUrl: source.site_url || '',
  }
}

export function getBrokerFieldForLead(lead: Record<string, unknown>): unknown {
  for (const key of ['is_broker', 'is_realtor', 'realtor'] as const) {
    const value = lead[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }
  return null
}

export function formatBrokerYesNo(raw: unknown): string {
  if (raw === null || raw === undefined) return 'N/A'
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No'
  const value = String(raw).trim()
  if (!value) return 'N/A'
  const lower = value.toLowerCase()
  if (lower === 'true' || lower === 'yes' || lower === 'y' || lower === '1') return 'Yes'
  if (lower === 'false' || lower === 'no' || lower === 'n' || lower === '0') return 'No'
  return value
}

const INTERESTED_KEYS = [
  'model',
  'collection',
  'interest',
  'home_interest',
  'buyer_type',
  'timeline',
  'project_tag',
  'form_type',
  'form_location',
  'lot_width',
  'budget_range',
  'preferred_contact',
  'purchase_timeframe',
  'lead_type',
  'project',
] as const

export function resolveInterestedFromLead(lead: Record<string, unknown>): string {
  const parts: string[] = []
  for (const key of INTERESTED_KEYS) {
    const value = lead[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      parts.push(String(value).trim())
    }
  }
  // Avoid duplicating project_name when it's just the brand
  if (parts.length === 0 && lead.project_name) {
    return String(lead.project_name)
  }
  return parts.length ? [...new Set(parts)].join(' · ') : 'N/A'
}

export function resolveLandingProjectName(
  lead: Record<string, unknown>,
  meta: LandingPageSheetMeta
): string {
  const website = meta.websiteName
  const candidates = [
    lead.collection,
    lead.project,
    lead.project_tag,
    lead.form_type,
    lead.form_location,
    lead.website_name,
    lead.website,
  ]
    .map((v) => (v === undefined || v === null ? '' : String(v).trim()))
    .filter(Boolean)

  const projectName = String(lead.project_name ?? '').trim()
  if (projectName && projectName.toLowerCase() !== website.toLowerCase()) {
    // Prefer form location / tag over raw project_name when both exist
    const formish = candidates[0]
    if (formish) return `${website} — ${formish}`
    return `${website} — ${projectName}`
  }

  if (candidates[0]) return `${website} — ${candidates[0]}`
  return website
}

export function resolveLandingPageLink(
  lead: Record<string, unknown>,
  meta: LandingPageSheetMeta
): string {
  const redirect = String(lead.redirect_link ?? '').trim()
  if (redirect) {
    if (/^https?:\/\//i.test(redirect)) return redirect
    if (redirect.includes('.')) return `https://${redirect.replace(/^\/\//, '')}`
  }

  const source = String(lead.source ?? '').trim()
  const pagePathRaw = String(lead.page_path ?? lead.source_page ?? '/').trim() || '/'
  const pagePath = pagePathRaw.startsWith('/') ? pagePathRaw : `/${pagePathRaw}`

  if (source.includes('.')) {
    const host = source.replace(/^https?:\/\//i, '').replace(/\/$/, '')
    return `https://${host}${pagePath === '/' ? '' : pagePath}`
  }

  if (/^https?:\/\//i.test(meta.siteUrl)) {
    try {
      return new URL(pagePath, meta.siteUrl).href
    } catch {
      return meta.siteUrl
    }
  }

  return meta.siteUrl || 'N/A'
}

/** Append optional detail lines for SMS / email body. */
export function appendLandingLeadDetailLines(
  lead: Record<string, unknown>,
  lines: string[]
): void {
  const broker = formatBrokerYesNo(getBrokerFieldForLead(lead))
  if (broker !== 'N/A') lines.push(`🏢 Broker: ${broker}`)

  const detailMap: Array<[string, string]> = [
    ['🏘️ Collection', 'collection'],
    ['🏠 Model', 'model'],
    ['🏠 Interest', 'interest'],
    ['🏠 Home Interest', 'home_interest'],
    ['🏷️ Buyer Type', 'buyer_type'],
    ['📅 Timeline', 'timeline'],
    ['🏷️ Project tag', 'project_tag'],
    ['📋 Form', 'form_type'],
    ['📋 Form', 'form_location'],
    ['📋 Form', 'form_name'],
    ['🌐 Page', 'page_path'],
    ['🌐 Page', 'source_page'],
    ['🏢 Project', 'project'],
    ['🏢 Project', 'project_name'],
    ['📐 Lot Width', 'lot_width'],
    ['💰 Budget', 'budget_range'],
    ['📞 Preferred contact', 'preferred_contact'],
    ['📌 Source', 'source'],
    ['📝 Notes', 'notes'],
  ]

  const seenLabels = new Set<string>()
  for (const [label, key] of detailMap) {
    const value = lead[key]
    if (value === undefined || value === null || String(value).trim() === '') continue
    if (seenLabels.has(label)) continue
    seenLabels.add(label)
    lines.push(`${label}: ${String(value).trim()}`)
  }

  if (lead.utm_source) {
    const utm = [lead.utm_source, lead.utm_campaign].filter(Boolean).join(' / ')
    lines.push(`🔗 UTM: ${utm}`)
  }
}

/**
 * One-shot SQL: RLS for dashboard + AFTER INSERT → /api/leads/notify
 * Safe to re-run. Does not alter lead columns or delete rows.
 */
export function generateLandingPageSetupSql(source: {
  table_name: string
  display_name?: string
}): string {
  const table = source.table_name.trim().toLowerCase()
  if (!isValidLandingPageTableName(table)) {
    throw new Error('Invalid table_name. Use lowercase letters, numbers, underscores; start with a letter.')
  }

  const fn = `notify_new_${table}_lead`
  // Postgres truncates identifiers at 63 chars
  const fnSafe = fn.slice(0, 63)
  const label = source.display_name || table

  return `-- =============================================================================
-- ${label} (${table})
-- RLS for dashboard + AFTER INSERT notification (email / SMS / Google Sheet)
-- SAFE: does not alter columns or delete rows. Idempotent re-run OK.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read ${table}" ON public.${table};
CREATE POLICY "Allow dashboard to read ${table}"
  ON public.${table} FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow dashboard to update ${table}" ON public.${table};
CREATE POLICY "Allow dashboard to update ${table}"
  ON public.${table} FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert ${table}" ON public.${table};
CREATE POLICY "Allow insert ${table}"
  ON public.${table} FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete ${table}" ON public.${table};
CREATE POLICY "Allow dashboard to delete ${table}"
  ON public.${table} FOR DELETE TO anon, authenticated
  USING (true);

DROP TRIGGER IF EXISTS ${fnSafe} ON public.${table};
DROP FUNCTION IF EXISTS public.${fnSafe}();

CREATE OR REPLACE FUNCTION public.${fnSafe}()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload JSONB;
  request_id BIGINT;
  dashboard_url TEXT := '${DASHBOARD_NOTIFY_URL}';
BEGIN
  payload := to_jsonb(NEW) || jsonb_build_object('table_name', '${table}');

  SELECT net.http_post(
    url := dashboard_url || '/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE '${label} lead notification sent (request_id: %)', request_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ${fnSafe}
  AFTER INSERT ON public.${table}
  FOR EACH ROW
  EXECUTE FUNCTION public.${fnSafe}();

COMMIT;

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = '${table}'
  AND trigger_name = '${fnSafe}';
`
}

/** Probe which name columns exist on a public table. */
export async function detectNameStyle(
  tableName: string
): Promise<'firstname' | 'first_name' | 'auto'> {
  if (!isValidLandingPageTableName(tableName)) return 'auto'
  const supabase = getSupabaseAdmin()

  const snake = await supabase.from(tableName).select('first_name, last_name').limit(1)
  if (!snake.error) return 'first_name'

  const flat = await supabase.from(tableName).select('firstname, lastname').limit(1)
  if (!flat.error) return 'firstname'

  return 'auto'
}

export async function verifyLeadTable(tableName: string): Promise<{
  ok: boolean
  message: string
  name_style?: LandingPageNameStyle
  sample_count?: number
}> {
  if (!isValidLandingPageTableName(tableName)) {
    return { ok: false, message: 'Invalid table name format' }
  }

  const supabase = getSupabaseAdmin()
  const nameStyle = await detectNameStyle(tableName)

  if (nameStyle === 'auto') {
    const { error } = await supabase.from(tableName).select('id').limit(1)
    if (error) {
      return {
        ok: false,
        message: `Cannot read public.${tableName}: ${error.message}`,
      }
    }
    return {
      ok: true,
      message: `Table exists but name columns were not detected (expected firstname/lastname or first_name/last_name).`,
      name_style: 'auto',
    }
  }

  const cols =
    nameStyle === 'firstname'
      ? 'id, firstname, lastname, email, phone'
      : 'id, first_name, last_name, email, phone'

  const { data, error, count } = await supabase
    .from(tableName)
    .select(cols, { count: 'exact' })
    .limit(1)

  if (error) {
    return { ok: false, message: error.message }
  }

  return {
    ok: true,
    message: `OK — public.${tableName} readable (${nameStyle} name columns).`,
    name_style: nameStyle,
    sample_count: count ?? data?.length ?? 0,
  }
}
