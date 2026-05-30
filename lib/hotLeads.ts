export type HotLeadPriority = 'urgent' | 'active' | 'new'
export type HotLeadSourceType = 'manual' | 'linked'

export interface HotLead {
  id: string
  display_name: string
  phone: string | null
  email: string | null
  project_name: string | null
  notes: string | null
  priority: HotLeadPriority
  source_type: HotLeadSourceType
  source_table: string | null
  source_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export const HOT_LEAD_PRIORITIES = {
  urgent: {
    label: 'Call now',
    color: 'bg-red-100 text-red-800 border-red-200',
    dotColor: 'bg-red-500',
    ringColor: 'ring-red-400',
  },
  active: {
    label: 'In progress',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    dotColor: 'bg-orange-500',
    ringColor: 'ring-orange-400',
  },
  new: {
    label: 'New on list',
    color: 'bg-green-100 text-green-800 border-green-200',
    dotColor: 'bg-green-500',
    ringColor: 'ring-green-400',
  },
} as const

export const LEAD_SOURCE_TABLES = {
  fj_leads: { label: 'FJ Leads', route: '/fj-leads' },
  precon_factory_leads: { label: 'Precon Factory', route: '/precon-leads' },
  precon_factory_website_leads: { label: 'Precon Website', route: '/precon-factory-website-leads' },
  gta_lowrise_leads: { label: 'GTA Lowrise', route: '/gta-lowrise-leads' },
  rental_leads: { label: 'Rental Leads', route: '/rental-leads' },
  cornerstone_leads: { label: 'Cornerstone', route: '/landing-pages-leads' },
  novella_leads: { label: 'Novella', route: '/landing-pages-leads' },
  lakeview_village_leads: { label: 'Lakeview Village', route: '/landing-pages-leads' },
} as const

export type LeadSourceTable = keyof typeof LEAD_SOURCE_TABLES

export const SEARCHABLE_LEAD_TABLES: LeadSourceTable[] = [
  'fj_leads',
  'precon_factory_leads',
  'precon_factory_website_leads',
  'gta_lowrise_leads',
  'rental_leads',
  'cornerstone_leads',
  'novella_leads',
  'lakeview_village_leads',
]

export interface LeadSearchResult {
  source_table: LeadSourceTable
  source_id: string
  display_name: string
  phone: string | null
  email: string | null
  project_name: string | null
}

export function buildDisplayName(firstname?: string | null, lastname?: string | null): string {
  const name = [firstname, lastname].filter(Boolean).join(' ').trim()
  return name || 'Unknown'
}

export function getSourceLabel(sourceTable: string | null, sourceType: HotLeadSourceType): string {
  if (sourceType === 'manual' || !sourceTable) return 'Manual'
  const config = LEAD_SOURCE_TABLES[sourceTable as LeadSourceTable]
  return config?.label ?? sourceTable
}

export function getSourceRoute(sourceTable: string | null): string | null {
  if (!sourceTable) return null
  const config = LEAD_SOURCE_TABLES[sourceTable as LeadSourceTable]
  return config?.route ?? null
}

export function isValidPriority(value: string): value is HotLeadPriority {
  return value === 'urgent' || value === 'active' || value === 'new'
}

export function isValidLeadSourceTable(table: string): table is LeadSourceTable {
  return table in LEAD_SOURCE_TABLES
}
