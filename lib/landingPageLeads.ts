/** Website-owned tables — do not ALTER columns from dashboard SQL scripts. */
export const ENCLAVE_LEADS_TABLE = 'enclave' as const
export const HAWTHORNE_EAST_VILLAGE_TABLE = 'hawthorne_east_village' as const
export const BRONTE_TRAILS_TABLE = 'bronte_trails' as const
export const SPRUCE_TRAILS_TABLE = 'spruce_trails' as const
export const MEADOWVALE_BROOKS_TABLE = 'meadowvale_brooks' as const

export const LANDING_PAGE_BRAND_LABELS: Record<string, string> = {
  cornerstone_leads: 'Cornerstone',
  novella_leads: 'Novella',
  lakeview_village_leads: 'Lakeview Village',
  rollingwood_leads: 'Rollingwood',
  [ENCLAVE_LEADS_TABLE]: 'Enclave',
  [HAWTHORNE_EAST_VILLAGE_TABLE]: 'Hawthorne East Village',
  [BRONTE_TRAILS_TABLE]: 'Bronte Trails',
  [SPRUCE_TRAILS_TABLE]: 'Spruce Trails',
  [MEADOWVALE_BROOKS_TABLE]: 'Meadowvale Brooks',
}

const TABLES_WITHOUT_CRM = new Set<string>([
  ENCLAVE_LEADS_TABLE,
  HAWTHORNE_EAST_VILLAGE_TABLE,
  BRONTE_TRAILS_TABLE,
  SPRUCE_TRAILS_TABLE,
  MEADOWVALE_BROOKS_TABLE,
])

export const WEBSITE_FORM_TABLES = new Set<string>([
  ENCLAVE_LEADS_TABLE,
  HAWTHORNE_EAST_VILLAGE_TABLE,
  BRONTE_TRAILS_TABLE,
  SPRUCE_TRAILS_TABLE,
  MEADOWVALE_BROOKS_TABLE,
])

export function getLandingPageBrandLabel(tableName: string): string {
  return LANDING_PAGE_BRAND_LABELS[tableName] ?? tableName
}

/** Tables without call_count / lead_temperature CRM columns. */
export function hasLandingPageCrmColumns(tableName: string): boolean {
  return !TABLES_WITHOUT_CRM.has(tableName)
}

export const LANDING_PAGE_LEAD_TABLES = [
  'cornerstone_leads',
  'novella_leads',
  'lakeview_village_leads',
  'rollingwood_leads',
  ENCLAVE_LEADS_TABLE,
  HAWTHORNE_EAST_VILLAGE_TABLE,
  BRONTE_TRAILS_TABLE,
  SPRUCE_TRAILS_TABLE,
  MEADOWVALE_BROOKS_TABLE,
] as const
