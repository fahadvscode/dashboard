import { connection } from 'next/server'
import FubBookingForm from '@/components/FubBookingForm'
import {
  fubPersonName,
  pickFubEmail,
  pickFubPhone,
  resolveFubBookingState,
} from '@/lib/fubEmbeddedApp'
import {
  extractFubTags,
  fetchFollowUpBossPersonTags,
  listUpcomingFubAppointments,
  matchProjectsFromTags,
} from '@/lib/fubProjects'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: 16,
        background: '#fff',
        color: '#1f2933',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <p style={{ margin: 0, fontSize: 13, color: '#667085', lineHeight: 1.45 }}>{body}</p>
    </div>
  )
}

export default async function FubBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ context?: string; signature?: string }>
}) {
  await connection()
  const params = await searchParams
  const context = typeof params.context === 'string' ? params.context : ''
  const signature = typeof params.signature === 'string' ? params.signature : ''
  const resolved = resolveFubBookingState(context, signature)

  if (resolved.status === 'missing_secret') {
    return (
      <Message
        title="Almost ready"
        body="Add FUB_EMBEDDED_APP_SECRET in Vercel (the Secret Key from this Follow Up Boss app), then redeploy."
      />
    )
  }

  if (resolved.status === 'no_context') {
    return (
      <Message
        title="Open from Follow Up Boss"
        body="This page loads on a lead in Follow Up Boss. Enable Bookings Integration, then open any contact."
      />
    )
  }

  if (resolved.status === 'unauthorized') {
    return (
      <Message
        title="Not authorized"
        body="This request could not be verified. Check the Secret Key saved in Vercel matches Follow Up Boss."
      />
    )
  }

  if (resolved.status === 'account_not_found') {
    return (
      <Message
        title="Account not found"
        body="This Follow Up Boss account is not connected yet. Enable the Bookings Integration app for this account."
      />
    )
  }

  if (resolved.status === 'user_not_found') {
    return (
      <Message
        title="User not found"
        body="This Follow Up Boss user is not set up for booking yet."
      />
    )
  }

  if (resolved.status === 'person_not_found') {
    return (
      <Message
        title="Person not found"
        body="Open a lead profile to book a meeting. There is no contact on this screen."
      />
    )
  }

  const person = resolved.context?.person
  const leadName = fubPersonName(person)
  const contextTags = extractFubTags(person)
  const apiTags = person?.id != null ? await fetchFollowUpBossPersonTags(String(person.id)) : []
  const tags = [...new Set([...contextTags, ...apiTags])]
  const taggedProjects = await matchProjectsFromTags(tags)
  const appointments = await listUpcomingFubAppointments(pickFubEmail(person), pickFubPhone(person))

  return (
    <FubBookingForm
      context={context}
      signature={signature}
      firstName={person?.firstName || person?.first_name || leadName}
      lastName={person?.lastName || person?.last_name || ''}
      email={pickFubEmail(person)}
      phone={pickFubPhone(person)}
      taggedProjects={taggedProjects}
      appointments={appointments}
    />
  )
}
