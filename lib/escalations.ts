import { BOOKED_BY_OPTIONS } from '@/lib/bookedBy'

export const ESCALATION_FROM_STAFF = BOOKED_BY_OPTIONS
export type EscalationFromStaff = (typeof ESCALATION_FROM_STAFF)[number]

export const ESCALATION_TO_STAFF = ['Fahad', 'Gigi', 'Jay'] as const
export type EscalationStaff = (typeof ESCALATION_TO_STAFF)[number]

export const ESCALATION_STAFF = ESCALATION_FROM_STAFF

export function parseEscalationFrom(value: unknown): EscalationFromStaff | '' {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return ESCALATION_FROM_STAFF.find((name) => name.toLowerCase() === raw.toLowerCase()) || ''
}

export function parseEscalationStaff(value: unknown): EscalationStaff | '' {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return ESCALATION_TO_STAFF.find((name) => name.toLowerCase() === raw.toLowerCase()) || ''
}

export function whoHasToCallLine(staff: string) {
  return `${staff} has to call the lead.`
}

export function buildEscalationSummary(staff: string, leadName: string, from?: string) {
  const who = leadName.trim() || 'Lead'
  const fromName = from?.trim()
  const base = `Escalation: ${staff} has to call ${who}`
  return fromName ? `${base} (from ${fromName})` : base
}

export function buildEscalationDescription(input: {
  staff: string
  from?: string
  leadName: string
  email: string
  phone: string
}) {
  const phone = input.phone.trim() || 'Not on file'
  const email = input.email.trim() || 'Not on file'
  const from = input.from?.trim()
  return [
    whoHasToCallLine(input.staff),
    '',
    'INTERNAL ESCALATION — the lead was not notified.',
    '',
    from ? `From: ${from}` : null,
    `Call: ${input.staff}`,
    `Lead: ${input.leadName.trim() || 'Lead'}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
  ]
    .filter((line) => line != null)
    .join('\n')
}

export function buildEscalationAdminSms(input: {
  staff: string
  from?: string
  leadName: string
  email: string
  phone: string
  date: string
  time: string
}) {
  const phone = input.phone.trim() || 'No phone'
  const email = input.email.trim() || 'No email'
  const from = input.from?.trim()
  return `🔔 Escalation

📞 ${whoHasToCallLine(input.staff)}${from ? `\n👤 From: ${from}` : ''}
👤 ${input.leadName.trim() || 'Lead'}
📱 ${phone}
📧 ${email}
📅 ${input.date}
🕐 ${input.time}

The lead was not contacted.`
}

export function buildEscalationAdminEmailHtml(input: {
  staff: string
  from?: string
  leadName: string
  email: string
  phone: string
  date: string
  time: string
}) {
  const lead = input.leadName.trim() || 'Lead'
  const phone = input.phone.trim() || 'Not on file'
  const email = input.email.trim() || 'Not on file'
  const from = input.from?.trim()
  const tel = input.phone.trim() ? `tel:${input.phone.trim()}` : ''
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
  <h2>Escalation</h2>
  <p style="background:#fef3c7;padding:12px 14px;border-left:4px solid #f59e0b;border-radius:6px">
    <strong>${whoHasToCallLine(input.staff)}</strong>
  </p>
  <p>${from ? `From: ${from}<br>` : ''}
  Lead: ${lead}<br>
  Email: ${email}<br>
  Phone: ${tel ? `<a href="${tel}">${phone}</a>` : phone}<br>
  Date: ${input.date}<br>
  Time: ${input.time}</p>
  <p>The lead was not emailed or texted.</p>
</body></html>`
}
