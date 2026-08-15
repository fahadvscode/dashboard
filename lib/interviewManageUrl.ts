export const INTERVIEW_MANAGE_BASE_URL = (
  process.env.INTERVIEW_MANAGE_BASE_URL || 'https://fahadsells.com/careers/manage'
).replace(/\/$/, '')

/** Build manage URL from booking row or API payload (manage_url or manage_token). */
export function resolveInterviewManageUrl(booking: Record<string, unknown>): string | null {
  const direct = typeof booking.manage_url === 'string' ? booking.manage_url.trim() : ''
  if (direct) return direct

  const token =
    typeof booking.manage_token === 'string'
      ? booking.manage_token.trim()
      : booking.manage_token != null
        ? String(booking.manage_token).trim()
        : ''

  if (!token) return null
  return `${INTERVIEW_MANAGE_BASE_URL}/${token}`
}

export function getInterviewManageLinkSms(manageUrl: string | null): string {
  if (!manageUrl) return ''
  return `\n\nReschedule or cancel anytime:\n${manageUrl}`
}

export function getInterviewManageLinkHtml(manageUrl: string | null): string {
  if (!manageUrl) {
    return `<div class="note" style="background:#fef3c7;padding:15px;border-radius:6px;margin:20px 0;border-left:4px solid #f59e0b;">
      <strong>Need to reschedule or cancel?</strong><br>
      If you need to change your interview, please contact us — your manage link will be in your confirmation SMS if available.
    </div>`
  }

  return `<div class="note" style="background:#eff6ff;padding:16px;border-radius:8px;margin:20px 0;border-left:4px solid #3b82f6;">
    <strong>Reschedule or cancel anytime</strong><br>
    <p>Use your personal link as many times as you need:</p>
    <p style="text-align:center;margin:16px 0;">
      <a href="${manageUrl}" target="_blank" style="display:inline-block;background:#1a73e8;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">Manage my interview</a>
    </p>
    <p style="font-size:13px;color:#6b7280;word-break:break-all;">Or copy this link: <a href="${manageUrl}" style="color:#3b82f6;">${manageUrl}</a></p>
  </div>`
}
