import { NextRequest, NextResponse } from 'next/server'
import { resolveFubBookingState } from '@/lib/fubEmbeddedApp'
import { fubApiFetch, getFubApiKey } from '@/lib/fubApi'
import { extractFubTags } from '@/lib/fubProjects'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TRY_AGAIN = 'FU-Try Again'
const MONTHLY = 'FU-Monthly'
const DND = 'DND'
const REMOVE_ON_DND = new Set([TRY_AGAIN.toLowerCase(), MONTHLY.toLowerCase()])

type Action = 'try_again' | 'monthly' | 'dnd'

function personIdFrom(person: { id?: number | string } | undefined) {
  const id = typeof person?.id === 'number' ? person.id : Number(String(person?.id || '').trim())
  return Number.isFinite(id) && id > 0 ? String(id) : ''
}

function dndLastName(lastName: string) {
  const last = lastName.trim()
  if (/^dnd\b/i.test(last)) return last
  return last ? `DND ${last}` : 'DND'
}

export async function POST(request: NextRequest) {
  try {
    if (!getFubApiKey()) {
      return NextResponse.json({ error: 'Add FUB_API_KEY in Vercel so lead tags can be saved.' }, { status: 500 })
    }

    const body = await request.json()
    const resolved = resolveFubBookingState(
      typeof body.context === 'string' ? body.context : '',
      typeof body.signature === 'string' ? body.signature : ''
    )
    if (resolved.status !== 'working' || !resolved.context?.person) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const action = String(body.action || '') as Action
    if (action !== 'try_again' && action !== 'monthly' && action !== 'dnd') {
      return NextResponse.json({ error: 'Choose Try Again, Monthly, or DND.' }, { status: 400 })
    }

    const personId = personIdFrom(resolved.context.person)
    if (!personId) {
      return NextResponse.json({ error: 'Open a lead before using these buttons.' }, { status: 400 })
    }

    const current = await fubApiFetch(`/people/${encodeURIComponent(personId)}`)
    if (!current.ok) {
      const details = current.json as { errorMessage?: string; error?: string }
      return NextResponse.json(
        { error: details.errorMessage || details.error || 'Could not read this lead.' },
        { status: current.status }
      )
    }

    const person = current.json as { firstName?: string; lastName?: string; tags?: unknown }
    const firstName = String(person.firstName || '').trim()
    const lastName = String(person.lastName || '').trim()

    if (action === 'dnd') {
      const tags = extractFubTags(person).filter((tag) => !REMOVE_ON_DND.has(tag.toLowerCase()))
      if (!tags.some((tag) => tag.toLowerCase() === DND.toLowerCase())) tags.push(DND)
      const nextLast = dndLastName(lastName)
      const saved = await fubApiFetch(`/people/${encodeURIComponent(personId)}`, {
        method: 'PUT',
        body: JSON.stringify({
          firstName,
          lastName: nextLast,
          tags,
        }),
      })
      if (!saved.ok) {
        const details = saved.json as { errorMessage?: string; error?: string }
        return NextResponse.json(
          { error: details.errorMessage || details.error || 'Could not save DND.' },
          { status: saved.status }
        )
      }
      const display = `${firstName} ${nextLast}`.trim()
      return NextResponse.json({
        ok: true,
        firstName,
        lastName: nextLast,
        message: `Tagged DND. Name is now ${display}.`,
      })
    }

    const tag = action === 'try_again' ? TRY_AGAIN : MONTHLY
    const saved = await fubApiFetch(`/people/${encodeURIComponent(personId)}?mergeTags=true`, {
      method: 'PUT',
      body: JSON.stringify({ tags: [tag] }),
    })
    if (!saved.ok) {
      const details = saved.json as { errorMessage?: string; error?: string }
      return NextResponse.json(
        { error: details.errorMessage || details.error || 'Could not save the tag.' },
        { status: saved.status }
      )
    }
    return NextResponse.json({
      ok: true,
      firstName,
      lastName,
      message: `Tagged ${tag}.`,
    })
  } catch (error) {
    console.error('FUB lead flag error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update this lead.' },
      { status: 500 }
    )
  }
}
