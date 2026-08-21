/** Admin notification fields for fahad_sells_interview_bookings (excludes contact/scheduling shown separately). */

const SKIP_INTERVIEW_ADMIN_KEYS = new Set([
  'id',
  'created_at',
  'calendar_event_id',
  'table_name',
  'firstname',
  'lastname',
  'first_name',
  'last_name',
  'email',
  'phone',
  'appointment_date',
  'appointment_time',
  'appointment_end_time',
  'meeting_format',
  'appointment_type',
  'message',
  'notes',
  'resume_url',
  'resume_path',
  'resume_file_name',
  'last_sync_source',
  'manage_token',
  'manage_url',
  'candidate_number',
])

const INTERVIEW_FIELD_LABELS: Record<string, string> = {
  full_name: 'Full name',
  application_id: 'Application ID',
  position_label: 'Position',
  position_id: 'Position ID',
  city: 'City',
  employment_type: 'Employment type',
  years_sales_experience: 'Years sales experience',
  real_estate_experience: 'Real estate experience',
  crm_experience: 'CRM experience',
  comfortable_call_volume: 'Comfortable call volume',
  languages: 'Languages',
  available_hours: 'Available hours',
  start_availability: 'Start availability',
  compensation_preference: 'Compensation preference',
  quiet_workspace: 'Quiet workspace',
  why_this_role: 'Why this role',
  recent_experience: 'Recent experience',
  rejection_story: 'Rejection story',
  slot_start: 'Slot start',
  slot_end: 'Slot end',
  status: 'Status',
}

const INTERVIEW_FIELD_ORDER = [
  'full_name',
  'position_label',
  'position_id',
  'application_id',
  'city',
  'employment_type',
  'years_sales_experience',
  'real_estate_experience',
  'crm_experience',
  'comfortable_call_volume',
  'languages',
  'available_hours',
  'start_availability',
  'compensation_preference',
  'quiet_workspace',
  'why_this_role',
  'recent_experience',
  'rejection_story',
  'slot_start',
  'slot_end',
  'status',
]

function formatInterviewFieldValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    return value
      .map((item) => formatInterviewFieldValue(item))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  const text = String(value).trim()
  return text
}

export function listInterviewApplicationFields(
  booking: Record<string, unknown>,
  extraSkip: string[] = []
): Array<{ key: string; label: string; value: string }> {
  const extra = new Set(extraSkip)
  return orderedInterviewAdminEntries(booking).filter(({ key }) => !extra.has(key))
}

export function interviewApplicationExportFieldDefs(
  records: Record<string, unknown>[]
): Array<{ key: string; label: string }> {
  const skip = new Set([
    ...SKIP_INTERVIEW_ADMIN_KEYS,
    'full_name',
    'status',
    'slot_start',
    'slot_end',
  ])
  const seen = new Set<string>()
  const defs: Array<{ key: string; label: string }> = []

  const add = (key: string) => {
    if (seen.has(key) || skip.has(key)) return
    seen.add(key)
    defs.push({
      key,
      label: INTERVIEW_FIELD_LABELS[key] || key.replace(/_/g, ' '),
    })
  }

  for (const key of INTERVIEW_FIELD_ORDER) add(key)
  for (const record of records) {
    for (const key of Object.keys(record).sort()) add(key)
  }

  return defs
}

export function getInterviewFieldDisplayValue(booking: Record<string, unknown>, key: string): string {
  return formatInterviewFieldValue(booking[key])
}

function orderedInterviewAdminEntries(booking: Record<string, unknown>): Array<{ key: string; label: string; value: string }> {
  const seen = new Set<string>()
  const entries: Array<{ key: string; label: string; value: string }> = []

  const add = (key: string) => {
    if (seen.has(key) || SKIP_INTERVIEW_ADMIN_KEYS.has(key)) return
    const value = formatInterviewFieldValue(booking[key])
    if (!value) return
    seen.add(key)
    entries.push({
      key,
      label: INTERVIEW_FIELD_LABELS[key] || key.replace(/_/g, ' '),
      value,
    })
  }

  for (const key of INTERVIEW_FIELD_ORDER) add(key)
  for (const key of Object.keys(booking).sort()) add(key)

  return entries
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Extra lines for admin SMS (keep shorter for Twilio). */
export function buildInterviewAdminSmsDetails(booking: Record<string, unknown>): string {
  const lines: string[] = []
  const longKeys = new Set(['why_this_role', 'recent_experience', 'rejection_story'])

  for (const { label, value, key } of orderedInterviewAdminEntries(booking)) {
    let display = value
    if (longKeys.has(key) && display.length > 160) {
      display = `${display.slice(0, 160)}…`
    }
    lines.push(`${label}: ${display}`)
  }

  return lines.length ? `\n\n— Application —\n${lines.join('\n')}` : ''
}

/** HTML rows for admin email detail table. */
export function buildInterviewAdminEmailDetailRows(booking: Record<string, unknown>): string {
  return orderedInterviewAdminEntries(booking)
    .map(
      ({ label, value }) =>
        `<div class="detail-row"><div class="detail-label">${escapeHtml(label)}:</div><div class="detail-value">${escapeHtml(value).replace(/\n/g, '<br>')}</div></div>`
    )
    .join('')
}
