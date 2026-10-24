import { getSupabaseAdmin } from '@/lib/supabase'

export async function logOutboundSms(input: {
  messageSid?: string | null
  fromPhone?: string | null
  toPhone?: string | null
  body?: string | null
  status?: string | null
  leadName?: string | null
  leadId?: string | null
  leadTable?: string | null
  createdAt?: string | null
}) {
  const messageSid = String(input.messageSid || '').trim()
  const fromPhone = String(input.fromPhone || '').trim()
  const toPhone = String(input.toPhone || '').trim()
  const body = String(input.body || '')
  if (!messageSid || !fromPhone || !toPhone || !body) return

  try {
    const supabase = getSupabaseAdmin()
    const row: Record<string, string | null> = {
      message_sid: messageSid,
      from_phone: fromPhone,
      to_phone: toPhone,
      message_body: body,
      direction: 'outbound',
      status: input.status || 'sent',
      lead_name: input.leadName || null,
      lead_id: input.leadId || null,
      lead_table: input.leadTable || null,
    }
    if (input.createdAt) row.created_at = input.createdAt
    const { error } = await supabase
      .from('sms_conversations')
      .upsert(row, { onConflict: 'message_sid', ignoreDuplicates: true })
    if (error) console.error('Could not log SMS conversation:', error.message)
  } catch (error) {
    console.error('Could not log SMS conversation:', error)
  }
}
