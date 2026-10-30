import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { fubApiFetch, listFubUsers } from '@/lib/fubApi'
import {
  FUB_BOOKING_BRANDS,
  fubPersonName,
  resolveFubBookingState,
} from '@/lib/fubEmbeddedApp'
import { worksheetLink } from '@/lib/worksheetLink'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const SENDER_NAME = 'Fahad Javed Real Estate'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function worksheetEmailHtml(input: {
  firstName: string
  projectName: string
  link: string
  senderName: string
  brandLabel: string
}) {
  const greeting = input.firstName ? `Hi ${escapeHtml(input.firstName)},` : 'Hello,'
  const project = escapeHtml(input.projectName)
  const sender = escapeHtml(input.senderName)
  const brand = escapeHtml(input.brandLabel)
  const link = escapeHtml(input.link)
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Inter,Arial,sans-serif;color:#1f2933;">
  <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
    <div style="background:#ffffff;border-radius:12px;padding:28px 24px;border:1px solid #e5e7eb;">
      <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Please complete this worksheet so we can secure your unit at <strong>${project}</strong>.</p>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">It only takes a few minutes. Use the button below, fill in the purchaser details, and send it back to us.</p>
      <p style="margin:0 0 22px;">
        <a href="${link}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 18px;border-radius:8px;">Complete your worksheet</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#667085;">Or copy this link into your browser:</p>
      <p style="margin:0 0 22px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${link}" style="color:#1d4ed8;">${link}</a></p>
      <p style="margin:0;font-size:15px;line-height:1.5;">Thank you,<br>${sender}<br>${brand}</p>
    </div>
  </div>
</body>
</html>`
}

async function senderFromContext(user: { id?: number; name?: string; email?: string } | undefined) {
  let name = String(user?.name || '').trim()
  let email = String(user?.email || '').trim()
  const id = Number(user?.id)
  if ((!name || !email) && Number.isFinite(id) && id > 0) {
    const users = await listFubUsers().catch(() => [])
    const match = users.find((item) => item.id === id)
    if (match) {
      name = name || match.name
      email = email || match.email || ''
    }
  }
  return {
    id: Number.isFinite(id) && id > 0 ? id : 0,
    name: name || 'Your agent',
    email,
  }
}

async function saveWorksheetNote(input: {
  personId: number
  userId: number
  senderName: string
  projectName: string
  link: string
  clientEmail: string
}) {
  const body = `<p><strong>${escapeHtml(input.senderName)}</strong> sent a purchaser worksheet for <strong>${escapeHtml(input.projectName)}</strong>.</p><p>Email sent to ${escapeHtml(input.clientEmail)}.</p><p><a href="${escapeHtml(input.link)}">${escapeHtml(input.link)}</a></p>`
  const payload: Record<string, unknown> = {
    personId: input.personId,
    subject: `Worksheet sent — ${input.projectName}`,
    body,
    isHtml: true,
  }
  if (input.userId) payload.userId = input.userId
  const saved = await fubApiFetch('/notes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (saved.ok || !input.userId) return saved
  delete payload.userId
  return fubApiFetch('/notes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const resolved = resolveFubBookingState(
      typeof body.context === 'string' ? body.context : '',
      typeof body.signature === 'string' ? body.signature : ''
    )
    if (resolved.status !== 'working' || !resolved.context?.person) {
      return NextResponse.json({ error: 'Not authorized to send a worksheet from Follow Up Boss.' }, { status: 401 })
    }

    const brand = FUB_BOOKING_BRANDS.find((item) => item.id === body.brand)
    const projectName = String(body.projectName || body.project || '').trim()
    const projectId = String(body.projectId || '').trim()
    const link = brand ? worksheetLink(brand.id, projectName, projectId) : ''
    if (!brand || !link) {
      return NextResponse.json({ error: 'Choose a brand and a project first.' }, { status: 400 })
    }

    const person = resolved.context.person
    const personId = Number(person.id)
    const firstName = String(person.firstName || person.first_name || '').trim()
    const clientEmail = String(body.email || '').trim()
    if (!clientEmail || !clientEmail.includes('@')) {
      return NextResponse.json({ error: 'This person needs an email address.' }, { status: 400 })
    }

    const sender = await senderFromContext(resolved.context.user)
    const gmailUser = process.env.GMAIL_USER || 'info@qikfill.com'
    const gmailPass = process.env.GMAIL_APP_PASSWORD
    if (!gmailPass) {
      return NextResponse.json({ error: 'Email is not set up on the dashboard yet.' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    })
    const subject = `Please complete your worksheet for ${projectName}`
    const text = [
      firstName ? `Hi ${firstName},` : 'Hello,',
      '',
      `Please complete this worksheet so we can secure your unit at ${projectName}.`,
      '',
      link,
      '',
      'Thank you,',
      SENDER_NAME,
      brand.label,
    ].join('\n')
    const html = worksheetEmailHtml({
      firstName,
      projectName,
      link,
      senderName: SENDER_NAME,
      brandLabel: brand.label,
    })
    const replyTo = sender.email ? `"${SENDER_NAME}" <${sender.email}>` : undefined
    const mail = {
      to: clientEmail,
      replyTo,
      subject,
      text,
      html,
    }
    let sentFrom = sender.email
    try {
      await transporter.sendMail({
        ...mail,
        from: sender.email ? `"${SENDER_NAME}" <${sender.email}>` : `"${SENDER_NAME}" <${gmailUser}>`,
      })
      if (!sender.email) sentFrom = gmailUser
    } catch (error) {
      console.error('Worksheet email could not use the Follow Up Boss address:', error)
      await transporter.sendMail({
        ...mail,
        from: `"${SENDER_NAME}" <${gmailUser}>`,
      })
      sentFrom = gmailUser
    }

    let noteWarning = ''
    if (Number.isFinite(personId) && personId > 0) {
      const noted = await saveWorksheetNote({
        personId,
        userId: sender.id,
        senderName: sender.name,
        projectName,
        link,
        clientEmail,
      })
      if (!noted.ok) {
        console.error('Worksheet note failed:', noted.status, noted.json)
        noteWarning = ' The email was sent. It could not be added to the Follow Up Boss notes.'
      }
    } else {
      noteWarning = ' The email was sent. This lead has no Follow Up Boss id, so a note was not added.'
    }

    const who = fubPersonName(person) || firstName || clientEmail
    const fromNote = sender.email && sentFrom === sender.email
      ? ` from ${sender.email}`
      : sender.email
        ? `. Replies go to ${sender.email}`
        : ''
    return NextResponse.json({
      ok: true,
      link,
      message: `Worksheet sent to ${who}${fromNote}. It is in their Follow Up Boss notes.${noteWarning}`,
    })
  } catch (error) {
    console.error('Worksheet send failed:', error)
    return NextResponse.json({ error: 'Could not send the worksheet email.' }, { status: 500 })
  }
}
