import { NextRequest, NextResponse } from 'next/server'
import {
  CONSTANT_CONTACT_TOKEN_TYPE,
  constantContactFetch,
  exchangeConstantContactCode,
  saveConstantContactToken,
} from '@/lib/constantContact'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function page(title: string, body: string, ok: boolean) {
  const color = ok ? '#166534' : '#9a3412'
  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:Georgia,serif;background:#f8fafc;color:#111827;margin:0">
  <main style="max-width:640px;margin:48px auto;padding:32px;background:#fff;border:1px solid #e5e7eb;border-radius:16px">
    <p style="margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${color}">Constant Contact</p>
    <h1 style="margin:8px 0 16px;font-size:28px">${title}</h1>
    ${body}
  </main>
</body>
</html>`
  return new NextResponse(html, { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

function esc(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get('error')
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (error) {
    return page('Connection was not approved', `<p>${esc(error)}</p>`, false)
  }
  if (!code || state !== CONSTANT_CONTACT_TOKEN_TYPE) {
    return page('Connection did not finish', '<p>Constant Contact did not return a login code.</p>', false)
  }

  try {
    const token = await exchangeConstantContactCode(code)
    await saveConstantContactToken(token)

    const read = async (path: string) => {
      try {
        return await constantContactFetch(path)
      } catch (err) {
        console.error('Constant Contact read failed:', path, err)
        return {}
      }
    }
    const [account, contacts, lists, emails] = await Promise.all([
      read('/account/summary'),
      read('/contacts?limit=1'),
      read('/contact_lists?limit=1'),
      read('/emails?limit=1'),
    ])

    const name = [account.first_name, account.last_name].filter(Boolean).join(' ')
    const rows = [
      ['Account', account.organization_name || name || 'Connected'],
      ['Email', account.contact_email || ''],
      ['Contacts', contacts.contacts_count ?? ''],
      ['Lists', lists.lists_count ?? ''],
      ['Emails', emails.emails_count ?? ''],
    ]
    const list = rows
      .filter(([, value]) => value !== '')
      .map(([label, value]) => `<li><strong>${esc(label)}:</strong> ${esc(value)}</li>`)
      .join('')

    return page(
      'Constant Contact is connected',
      `<p>The login worked. This account can be read from the dashboard.</p><ul>${list}</ul>`,
      true
    )
  } catch (err) {
    console.error('Constant Contact OAuth callback failed:', err)
    return page(
      'Constant Contact login failed',
      `<p>${esc(err instanceof Error ? err.message : 'Could not finish the connection.')}</p>`,
      false
    )
  }
}
