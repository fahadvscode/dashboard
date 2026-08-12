import {
  BUILTIN_LANDING_PAGE_SOURCES,
  type LandingPageSource,
} from '@/lib/landingPageSources'

/** Website-owned tables — do not ALTER columns from dashboard SQL scripts. */
export const ENCLAVE_LEADS_TABLE = 'enclave' as const
export const HAWTHORNE_EAST_VILLAGE_TABLE = 'hawthorne_east_village' as const
export const BRONTE_TRAILS_TABLE = 'bronte_trails' as const
export const SPRUCE_TRAILS_TABLE = 'spruce_trails' as const
export const MEADOWVALE_BROOKS_TABLE = 'meadowvale_brooks' as const
export const THE_LEGACY_TABLE = 'the_legacy' as const
export const IVY_ROUGE_LANDING_LEADS_TABLE = 'ivy_rouge_landing_leads' as const
export const ABACOT_HILL_LEADS_TABLE = 'abacot_hill_leads' as const
export const OG_URBAN_TOWNS_LEADS_TABLE = 'og_urban_towns_leads' as const
export const ROSEMONT_GROVE_LEADS_TABLE = 'rosemont_grove_leads' as const
export const YT_ON_FOURTH_LEADS_TABLE = 'yt_on_fourth_leads' as const
export const HAWTHORNE_TRAFALGAR_LEADS_TABLE = 'hawthorne_trafalgar_leads' as const

export const LANDING_PAGE_BRAND_LABELS: Record<string, string> = Object.fromEntries(
  BUILTIN_LANDING_PAGE_SOURCES.map((s) => [s.table_name, s.display_name])
)

const TABLES_WITHOUT_CRM = new Set<string>(
  BUILTIN_LANDING_PAGE_SOURCES.filter((s) => !s.has_crm).map((s) => s.table_name)
)

/** Tables that typically store UTM/source in a `source` column (not CRM source). */
export const WEBSITE_FORM_TABLES = new Set<string>(
  BUILTIN_LANDING_PAGE_SOURCES.map((s) => s.table_name)
)

export function getLandingPageBrandLabel(
  tableName: string,
  sources?: LandingPageSource[]
): string {
  if (sources) {
    const match = sources.find((s) => s.table_name === tableName)
    if (match) return match.display_name
  }
  return LANDING_PAGE_BRAND_LABELS[tableName] ?? tableName
}

/** Tables without call_count / lead_temperature CRM columns. */
export function hasLandingPageCrmColumns(
  tableName: string,
  sources?: LandingPageSource[]
): boolean {
  if (sources) {
    const match = sources.find((s) => s.table_name === tableName)
    if (match) return match.has_crm
  }
  return !TABLES_WITHOUT_CRM.has(tableName)
}

export const LANDING_PAGE_LEAD_TABLES = BUILTIN_LANDING_PAGE_SOURCES.map(
  (s) => s.table_name
) as readonly string[]

export function filterKeyForTable(tableName: string): string {
  return tableName.replace(/_leads$/i, '').replace(/_/g, '')
}
