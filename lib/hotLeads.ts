export type HotLeadPriority = 'urgent' | 'active' | 'new'
export type HotLeadSourceType = 'manual' | 'linked'
export type ContactSourceKind = 'lead' | 'booking'

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

/** All dashboard tables that can be linked from Hot Leads search */
export const CONTACT_SOURCE_TABLES = {
  fj_leads: { label: 'FJ Leads', route: '/fj-leads', kind: 'lead' as const },
  precon_factory_leads: { label: 'Precon Factory Leads', route: '/precon-leads', kind: 'lead' as const },
  precon_factory_website_leads: {
    label: 'Precon Website Leads',
    route: '/precon-factory-website-leads',
    kind: 'lead' as const,
  },
  gta_lowrise_leads: { label: 'GTA Lowrise Leads', route: '/gta-lowrise-leads', kind: 'lead' as const },
  rental_leads: { label: 'Rental Leads', route: '/rental-leads', kind: 'lead' as const },
  cornerstone_leads: { label: 'Cornerstone Leads', route: '/landing-pages-leads', kind: 'lead' as const },
  novella_leads: { label: 'Novella Leads', route: '/landing-pages-leads', kind: 'lead' as const },
  lakeview_village_leads: {
    label: 'Lakeview Village Leads',
    route: '/landing-pages-leads',
    kind: 'lead' as const,
  },
  rollingwood_leads: {
    label: 'Rollingwood Leads',
    route: '/landing-pages-leads',
    kind: 'lead' as const,
  },
  enclave: { label: 'Enclave Leads', route: '/landing-pages-leads', kind: 'lead' as const },
  hawthorne_east_village: {
    label: 'Hawthorne East Village Leads',
    route: '/landing-pages-leads',
    kind: 'lead' as const,
  },
  bronte_trails: {
    label: 'Bronte Trails Leads',
    route: '/landing-pages-leads',
    kind: 'lead' as const,
  },
  spruce_trails: {
    label: 'Spruce Trails Leads',
    route: '/landing-pages-leads',
    kind: 'lead' as const,
  },
  meadowvale_brooks: {
    label: 'Meadowvale Brooks Leads',
    route: '/landing-pages-leads',
    kind: 'lead' as const,
  },
  fj_bookings: { label: 'FJ Booking', route: '/fj-bookings', kind: 'booking' as const },
  precon_factory_bookings: {
    label: 'Precon Factory Booking',
    route: '/precon-bookings',
    kind: 'booking' as const,
  },
  gta_lowrise_bookings: {
    label: 'GTA Lowrise Booking',
    route: '/gta-lowrise-bookings',
    kind: 'booking' as const,
  },
} as const

export type ContactSourceTable = keyof typeof CONTACT_SOURCE_TABLES

/** @deprecated Use CONTACT_SOURCE_TABLES */
export const LEAD_SOURCE_TABLES = CONTACT_SOURCE_TABLES

/** @deprecated Use ContactSourceTable */
export type LeadSourceTable = ContactSourceTable

export const SEARCHABLE_LEAD_TABLES: ContactSourceTable[] = [
  'fj_leads',
  'precon_factory_leads',
  'precon_factory_website_leads',
  'gta_lowrise_leads',
  'rental_leads',
  'cornerstone_leads',
  'novella_leads',
  'lakeview_village_leads',
  'rollingwood_leads',
  'enclave',
  'hawthorne_east_village',
  'bronte_trails',
  'spruce_trails',
  'meadowvale_brooks',
]

export const SEARCHABLE_BOOKING_TABLES: ContactSourceTable[] = [
  'fj_bookings',
  'precon_factory_bookings',
  'gta_lowrise_bookings',
]

export const SEARCHABLE_CONTACT_TABLES: ContactSourceTable[] = [
  ...SEARCHABLE_BOOKING_TABLES,
  ...SEARCHABLE_LEAD_TABLES,
]

export type ContactSuggestionTag =
  | 'meeting_passed'
  | 'meeting_today'
  | 'meeting_upcoming'
  | 'recent_lead'
  | null

export interface ContactSearchResult {
  source_table: ContactSourceTable
  source_id: string
  display_name: string
  phone: string | null
  email: string | null
  project_name: string | null
  source_kind: ContactSourceKind
  activity_at: string
  activity_summary: string
  suggestion_tag?: ContactSuggestionTag
}

/** @deprecated Use ContactSearchResult */
export type LeadSearchResult = ContactSearchResult

export function buildDisplayName(firstname?: string | null, lastname?: string | null): string {
  const name = [firstname, lastname].filter(Boolean).join(' ').trim()
  return name || 'Unknown'
}

export function getSourceLabel(sourceTable: string | null, sourceType: HotLeadSourceType): string {
  if (sourceType === 'manual' || !sourceTable) return 'Manual'
  const config = CONTACT_SOURCE_TABLES[sourceTable as ContactSourceTable]
  return config?.label ?? sourceTable
}

export function getSourceRoute(sourceTable: string | null): string | null {
  if (!sourceTable) return null
  const config = CONTACT_SOURCE_TABLES[sourceTable as ContactSourceTable]
  return config?.route ?? null
}

export function isValidPriority(value: string): value is HotLeadPriority {
  return value === 'urgent' || value === 'active' || value === 'new'
}

export function isValidContactSourceTable(table: string): table is ContactSourceTable {
  return table in CONTACT_SOURCE_TABLES
}

/** @deprecated Use isValidContactSourceTable */
export function isValidLeadSourceTable(table: string): table is ContactSourceTable {
  return isValidContactSourceTable(table)
}
