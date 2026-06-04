/** Supabase table for Enclave landing-page leads (schema owned by the website — do not ALTER here). */
export const ENCLAVE_LEADS_TABLE = 'enclave' as const

export const LANDING_PAGE_BRAND_LABELS: Record<string, string> = {
  cornerstone_leads: 'Cornerstone',
  novella_leads: 'Novella',
  lakeview_village_leads: 'Lakeview Village',
  rollingwood_leads: 'Rollingwood',
  [ENCLAVE_LEADS_TABLE]: 'Enclave',
}

export function getLandingPageBrandLabel(tableName: string): string {
  return LANDING_PAGE_BRAND_LABELS[tableName] ?? tableName
}

/** Enclave uses the website schema only — no call_count / lead_temperature columns yet. */
export function hasLandingPageCrmColumns(tableName: string): boolean {
  return tableName !== ENCLAVE_LEADS_TABLE
}

export const LANDING_PAGE_LEAD_TABLES = [
  'cornerstone_leads',
  'novella_leads',
  'lakeview_village_leads',
  'rollingwood_leads',
  ENCLAVE_LEADS_TABLE,
] as const
