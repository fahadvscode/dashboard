import { BOOKED_BY_OPTIONS } from '@/lib/bookedBy'

export const ESCALATION_STAFF = BOOKED_BY_OPTIONS
export type EscalationStaff = (typeof ESCALATION_STAFF)[number]

export function parseEscalationStaff(value: unknown): EscalationStaff | '' {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return ESCALATION_STAFF.find((name) => name.toLowerCase() === raw.toLowerCase()) || ''
}

export function whoHasToCallLine(staff: string) {
  return `${staff} has to call the lead.`
}

export function buildEscalationSummary(staff: string, leadName: string) {
  const who = leadName.trim() || 'Lead'
  return `${staff} has to call: ${who}`
}

export function buildEscalationDescription(input: {
  staff: string
  leadName: string
  email: string
  phone: string
}) {
  const phone = input.phone.trim() || 'Not on file'
  const email = input.email.trim() || 'Not on file'
  return [
    whoHasToCallLine(input.staff),
    '',
    'INTERNAL ESCALATION — the lead was not notified.',
    '',
    `Call: ${input.staff}`,
    `Lead: ${input.leadName.trim() || 'Lead'}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
  ].join('\n')
}

export function buildEscalationAdminSms(input: {
  staff: string
  leadName: string
  email: string
  phone: string
  date: string
  time: string
}) {
  const phone = input.phone.trim() || 'No phone'
  const email = input.email.trim() || 'No email'
  return `🔔 Escalation

📞 ${whoHasToCallLine(input.staff)}

👤 ${input.leadName.trim() || 'Lead'}
📱 ${phone}
📧 ${email}
📅 ${input.date}
🕐 ${input.time}

The lead was not contacted.`
}

export function buildEscalationAdminEmailHtml(input: {
  staff: string
  leadName: string
  email: string
  phone: string
  date: string
  time: string
}) {
  const lead = input.leadName.trim() || 'Lead'
  const phone = input.phone.trim() || 'Not on file'
  const email = input.email.trim() || 'Not on file'
  const tel = input.phone.trim() ? `tel:${input.phone.trim()}` : ''
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
  <h2>Escalation</h2>
  <p style="background:#fef3c7;padding:12px 14px;border-left:4px solid #f59e0b;border-radius:6px">
    <strong>${whoHasToCallLine(input.staff)}</strong>
  </p>
  <p>Lead: ${lead}<br>
  Email: ${email}<br>
  Phone: ${tel ? `<a href="${tel}">${phone}</a>` : phone}<br>
  Date: ${input.date}<br>
  Time: ${input.time}</p>
  <p>The lead was not emailed or texted.</p>
</body></html>`
}
